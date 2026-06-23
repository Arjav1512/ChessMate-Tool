import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, ErrorState, ProgressBar, SegmentedControl, Textarea, useIvToast } from '../../components/ui/iv';
import { useImportGames } from './useImportGames';
import type { ImportPreviewItem, ImportResult } from './types';
import './games.css';

type Source = 'paste' | 'upload';

/**
 * Game Import (System Design §4.3). Source picker (paste/upload; Connect = "soon")
 * → validation → parsed preview (new/duplicate/invalid) → progress → success with
 * exactly one recommended next action (never a dead-end). Routed, not a modal.
 */
export function ImportPage() {
  const navigate = useNavigate();
  const { toast } = useIvToast();
  const { preview, commit, progress, busy } = useImportGames();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, []);

  const [source, setSource] = useState<Source>('paste');
  const [text, setText] = useState('');
  const [items, setItems] = useState<ImportPreviewItem[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const runPreview = async (pgn: string) => {
    setError(null); setResult(null);
    if (!pgn.trim()) { setError('Paste a PGN first.'); return; }
    try {
      const parsed = await preview(pgn);
      if (parsed.length === 0) { setError('No games found in that PGN.'); return; }
      setItems(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that PGN.');
    }
  };

  const onFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    runPreview(content);
  };

  const doImport = async () => {
    if (!items) return;
    const res = await commit(items);
    setResult(res);
    setItems(null);
    if (res.imported > 0) toast(`${res.imported} game${res.imported === 1 ? '' : 's'} imported`, 'success');
    else if (res.duplicates > 0 && res.skipped === 0) toast('Those games are already in your library', 'info');
  };

  const counts = items
    ? { neu: items.filter((i) => i.status === 'new').length, dup: items.filter((i) => i.status === 'duplicate').length, bad: items.filter((i) => i.status === 'invalid').length }
    : null;

  return (
    <div className="iv-gimport iv-page-enter">
      <div>
        <h1 ref={h1Ref} tabIndex={-1} className="iv-games__title iv-h2" style={{ outline: 'none' }}>Add games</h1>
        <p className="iv-games__sub iv-body-sm">Paste a PGN or upload a file. We’ll parse, preview, and queue them for analysis.</p>
      </div>

      {/* ── Success (one recommended next action) ── */}
      {result ? (
        <div className="iv-gimport__success" role="status">
          <h2 className="iv-gimport__success-h iv-h3">
            {result.imported > 0 ? `${result.imported} game${result.imported === 1 ? '' : 's'} imported` : 'Nothing new to import'}
          </h2>
          <p className="iv-games__sub iv-body-sm">
            {[result.duplicates ? `${result.duplicates} already in your library` : '', result.skipped ? `${result.skipped} skipped` : ''].filter(Boolean).join(' · ') || 'Queued for analysis.'}
          </p>
          {result.errors.length > 0 && (
            <ul className="iv-gimport__preview" aria-label="Skipped games">
              {result.errors.slice(0, 5).map((e) => (
                <li key={e.index} className="iv-prow iv-prow--invalid"><span className="iv-prow__sub">Game {e.index + 1}: {e.reason}</span></li>
              ))}
            </ul>
          )}
          {/* exactly one primary next step — never a dead end */}
          {result.imported > 0
            ? <Button onClick={() => navigate('/games')}>Review imported games →</Button>
            : <Button onClick={() => { setResult(null); setText(''); }}>Import different games</Button>}
        </div>
      ) : items ? (
        /* ── Preview ── */
        <>
          <div className="iv-gimport__preview" aria-label="Parsed games preview">
            {items.map((i) => (
              <div key={i.index} className={`iv-prow iv-prow--${i.status}`}>
                <div className="iv-prow__body">
                  <div className="iv-prow__title">{i.status === 'invalid' ? 'Unparseable game' : `${i.white} vs ${i.black}`} {i.status !== 'invalid' && <span className="iv-res">{i.result}</span>}</div>
                  <div className="iv-prow__sub">{i.status === 'invalid' ? i.error : i.opening}</div>
                </div>
                <Badge impact={i.status === 'new' ? 'low' : i.status === 'duplicate' ? 'medium' : 'high'}>
                  {i.status === 'new' ? 'New' : i.status === 'duplicate' ? 'Already imported' : 'Invalid'}
                </Badge>
              </div>
            ))}
          </div>
          <div className="iv-gimport__bar">
            {progress?.phase === 'insert' ? (
              <span className="iv-gimport__progress" style={{ flex: 1, minWidth: 180 }}>
                <span className="iv-gimport__progresslabel">Importing… {progress.done}/{progress.total}</span>
                <ProgressBar value={progress.done} max={progress.total} ariaLabel={`Importing ${progress.done} of ${progress.total}`} />
              </span>
            ) : (
              <span className="iv-games__sub iv-body-sm">{counts!.neu} new · {counts!.dup} duplicate · {counts!.bad} invalid</span>
            )}
            <span style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="ghost" onClick={() => { setItems(null); setError(null); }}>Cancel</Button>
              <Button onClick={doImport} disabled={busy || counts!.neu === 0} loading={busy}>
                {counts!.neu > 0 ? `Import ${counts!.neu} →` : 'Nothing to import'}
              </Button>
            </span>
          </div>
        </>
      ) : (
        /* ── Source picker + input ── */
        <>
          <div className="iv-gimport__sources">
            <SegmentedControl ariaLabel="Import source" value={source} onChange={(v) => setSource(v)}
              options={[{ value: 'paste', label: 'Paste' }, { value: 'upload', label: 'Upload' }]} />
            <Button variant="ghost" disabled title="Coming soon">Connect Chess.com / Lichess · soon</Button>
          </div>

          {source === 'paste' ? (
            <>
              <Textarea aria-label="Paste PGN" rows={10} placeholder="Paste one or more PGNs here…" value={text} onChange={(e) => setText(e.target.value)} />
              {progress?.phase === 'parse' && <p className="iv-gimport__progresslabel">Parsing…</p>}
              <div><Button onClick={() => runPreview(text)} loading={busy} disabled={busy}>Preview games</Button></div>
            </>
          ) : (
            <div
              className={`iv-gimport__dropzone ${dragOver ? 'iv-gimport__dropzone--over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
            >
              <p>Drag a .pgn file here, or</p>
              <label className="iv-btn iv-btn--secondary" style={{ marginTop: 8, cursor: 'pointer' }}>
                Choose file
                <input type="file" accept=".pgn,.txt,text/plain" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
              </label>
            </div>
          )}

          {error && <ErrorState message={error} onRetry={() => runPreview(text)} retryLabel="Try again" />}
        </>
      )}
    </div>
  );
}
