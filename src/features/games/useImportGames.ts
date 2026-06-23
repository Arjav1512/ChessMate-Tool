import { useCallback, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth, ensureProfileExists } from '../../contexts/AuthContext';
import { detectUserColor } from '../../lib/userColor';
import { translateDbError } from '../../lib/dbErrors';
import { checkPgnSize } from '../../lib/pgnLimits';
import { deriveOpening, gameSignature } from '../../lib/games/deriveGameMeta';
import type { ParsedGame } from '../../workers/pgnWorker';
import type { ImportPreviewItem, ImportResult } from './types';

type Progress = { phase: 'parse' | 'insert'; done: number; total: number };

/** Promise wrapper around the off-main-thread PGN parser (reused contract). */
function parseInWorker(text: string, onProgress: (done: number, total: number) => void): Promise<{ games: ParsedGame[]; skipped: number; firstError?: string }> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../../workers/pgnWorker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(new Error(err instanceof Error ? err.message : 'Could not start the PGN parser')); return;
    }
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type === 'progress') onProgress(msg.done, msg.total);
      else if (msg?.type === 'done') { worker.terminate(); resolve({ games: msg.games, skipped: msg.skipped, firstError: msg.firstError }); }
      else if (msg?.type === 'error') { worker.terminate(); reject(new Error(msg.message)); }
    };
    worker.onerror = (err) => { worker.terminate(); reject(new Error(err.message || 'PGN parser error')); };
    worker.postMessage({ type: 'parse', text });
  });
}

async function existingSignatures(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('games').select('white_player, black_player, date, result').eq('user_id', userId);
  if (error || !data) return new Set();
  return new Set(data.map((g: { white_player: string; black_player: string; date: string; result: string }) => gameSignature(g)));
}

export interface UseImportGames {
  progress: Progress | null;
  busy: boolean;
  /** Parse + classify (new/duplicate/invalid). Throws on size/parse failure. */
  preview: (text: string) => Promise<ImportPreviewItem[]>;
  /** Insert the `new` items; returns a structured result (partial-safe). */
  commit: (items: ImportPreviewItem[]) => Promise<ImportResult>;
}

export function useImportGames(): UseImportGames {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useCallback(async (text: string): Promise<ImportPreviewItem[]> => {
    const size = checkPgnSize(text);
    if (!size.ok) throw new Error(size.message);
    setBusy(true); setProgress({ phase: 'parse', done: 0, total: 1 });
    try {
      const parsed = await parseInWorker(text, (done, total) => setProgress({ phase: 'parse', done, total }));
      // Dedupe against the user's existing games (by derived signature).
      const sigs = user ? await existingSignatures(user.id) : new Set<string>();
      const items: ImportPreviewItem[] = parsed.games.map((g, index) => {
        // Resolve the exact values that get persisted, then sign from those so
        // preview-time dedupe matches a future re-import (header-missing → 'Unknown').
        const white = g.headers.White || 'Unknown';
        const black = g.headers.Black || 'Unknown';
        const result = g.headers.Result || '*';
        const date = g.headers.Date ?? '';
        const sig = gameSignature({ white_player: white, black_player: black, date, result });
        return {
          index, white, black, result, date,
          event: g.headers.Event ?? '',
          opening: deriveOpening(g.pgnText),
          status: sigs.has(sig) ? 'duplicate' : 'new',
          pgnText: g.pgnText,
        };
      });
      // Surface games the parser skipped as invalid rows (recoverable context).
      if (parsed.skipped > 0) {
        items.push({ index: items.length, white: '—', black: '—', result: '*', date: '', event: '', opening: '', status: 'invalid', error: parsed.firstError ?? 'Could not parse this game', pgnText: '' });
      }
      return items;
    } finally {
      setBusy(false); setProgress(null);
    }
  }, [user]);

  const commit = useCallback(async (items: ImportPreviewItem[]): Promise<ImportResult> => {
    const toInsert = items.filter((i) => i.status === 'new');
    const duplicates = items.filter((i) => i.status === 'duplicate').length;
    const invalid = items.filter((i) => i.status === 'invalid').length;
    const result: ImportResult = { imported: 0, duplicates, skipped: invalid, errors: [] };
    if (!user || toInsert.length === 0) return result;

    setBusy(true);
    try {
      const profile = await ensureProfileExists(user);
      if (!profile.ok) { result.errors.push({ index: -1, reason: 'Could not prepare your profile. Sign out and back in, then retry.' }); result.skipped += toInsert.length; return result; }
      const { data: profileRow } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      const displayName = profileRow?.display_name ?? null;

      for (let i = 0; i < toInsert.length; i++) {
        const item = toInsert[i];
        setProgress({ phase: 'insert', done: i, total: toInsert.length });
        const white = item.white === 'Unknown' ? undefined : item.white;
        const black = item.black === 'Unknown' ? undefined : item.black;
        const { error } = await supabase.from('games').insert({
          user_id: user.id, pgn: item.pgnText,
          white_player: item.white, black_player: item.black, result: item.result,
          date: item.date, event: item.event,
          user_color: detectUserColor(white, black, displayName, user.email),
        });
        if (error) { result.errors.push({ index: item.index, reason: translateDbError(error).message }); result.skipped++; }
        else result.imported++;
      }
      return result;
    } finally {
      setBusy(false); setProgress(null);
    }
  }, [user]);

  return { progress, busy, preview, commit };
}
