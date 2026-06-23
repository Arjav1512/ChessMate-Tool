import { describe, it, expect } from 'vitest';
import { deriveOpening, deriveTimeControl, outcomeFor, gameSignature, timeControlBucket, toGameRowVM, pgnHeader } from '../../lib/games/deriveGameMeta';
import { filterGames, timeControlOptions } from './filterGames';
import { computeInsights } from './insights';
import { sampleGames, sampleAnalyzedIds, makeSampleGames } from './sampleGames';
import { DEFAULT_FILTER } from './types';
import type { Game } from '../../lib/supabase';

// ── deriveGameMeta (metadata derivation, no schema change) ──────────────────
describe('deriveGameMeta', () => {
  const pgn = '[White "you"][Black "rival"][Result "1-0"][Opening "Italian Game"][ECO "C50"][TimeControl "600+5"]\n\n1. e4 *';

  it('reads PGN headers + derives opening', () => {
    expect(pgnHeader(pgn, 'Opening')).toBe('Italian Game');
    expect(deriveOpening(pgn)).toBe('Italian Game');
    expect(deriveOpening('[ECO "B90"]')).toBe('B90');           // falls back to ECO
    expect(deriveOpening('1. e4 *')).toBe('Unknown opening');
  });

  it('formats time control + buckets it', () => {
    expect(deriveTimeControl(pgn)).toBe('10+5');
    expect(deriveTimeControl('[TimeControl "300"]')).toBe('5+0');
    expect(deriveTimeControl('[TimeControl "40/9000"]')).toBe('40/9000');
    expect(deriveTimeControl('1. e4 *')).toBe('—');
    expect(timeControlBucket('1+0')).toBe('Bullet');
    expect(timeControlBucket('5+3')).toBe('Blitz');
    expect(timeControlBucket('10+0')).toBe('Rapid');
    expect(timeControlBucket('30+0')).toBe('Classical');
  });

  it('derives outcome from result + user color', () => {
    expect(outcomeFor('1-0', 'white')).toBe('win');
    expect(outcomeFor('1-0', 'black')).toBe('loss');
    expect(outcomeFor('0-1', 'black')).toBe('win');
    expect(outcomeFor('1/2-1/2', 'white')).toBe('draw');
    expect(outcomeFor('1-0', null)).toBe('unknown'); // never guess
  });

  it('signature is stable, case-insensitive, and whitespace-canonical', () => {
    expect(gameSignature({ white_player: 'You', black_player: 'Rival', date: '2026-06-21', result: '1-0' }))
      .toBe('you|rival|2026-06-21|1-0');
    // trailing/extra whitespace must not defeat dedupe
    expect(gameSignature({ white_player: ' You ', black_player: 'Ri  val', date: '2026-06-21', result: '1-0' }))
      .toBe('you|ri val|2026-06-21|1-0');
  });

  it('floors base minutes so sub-3min is Bullet, not Blitz', () => {
    expect(deriveTimeControl('[TimeControl "179"]')).toBe('2+0'); // 179s → 2 (floor)
    expect(timeControlBucket(deriveTimeControl('[TimeControl "179"]'))).toBe('Bullet');
  });

  it('maps a game to a row VM with derived status', () => {
    const g = sampleGames[0];
    const vm = toGameRowVM(g, true);
    expect(vm.status).toBe('analyzed');
    expect(vm.opening).toBe('Italian Game');
    expect(toGameRowVM(g, false).status).toBe('pending');
  });
});

// ── filterGames (pure filter + sort) ───────────────────────────────────────
describe('filterGames', () => {
  const rows = sampleGames.map((g) => toGameRowVM(g, sampleAnalyzedIds.has(g.id)));

  it('filters by result, color, and search; sorts by date', () => {
    expect(filterGames(rows, { ...DEFAULT_FILTER, result: 'loss' }).every((r) => r.outcome === 'loss')).toBe(true);
    expect(filterGames(rows, { ...DEFAULT_FILTER, color: 'white' }).every((r) => r.userColor === 'white')).toBe(true);
    const search = filterGames(rows, { ...DEFAULT_FILTER, search: 'carlsen' });
    expect(search.length).toBe(1);
    const asc = filterGames(rows, { ...DEFAULT_FILTER, sort: 'oldest' });
    expect(asc[0].date <= asc[asc.length - 1].date).toBe(true);
  });

  it('filters by favorites', () => {
    const favs = new Set([rows[0].id]);
    const out = filterGames(rows, DEFAULT_FILTER, { favoritesOnly: true, favorites: favs });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(rows[0].id);
  });

  it('lists present time-control buckets', () => {
    expect(timeControlOptions(rows).length).toBeGreaterThan(0);
  });

  it('scales: filters + sorts 500 games correctly', () => {
    const many = makeSampleGames(500).map((g) => toGameRowVM(g, true));
    expect(many).toHaveLength(500);
    const losses = filterGames(many, { ...DEFAULT_FILTER, result: 'loss' });
    expect(losses.every((r) => r.outcome === 'loss')).toBe(true);
    expect(losses.length).toBeGreaterThan(0);
    const sorted = filterGames(many, { ...DEFAULT_FILTER, sort: 'newest' });
    expect(sorted[0].date >= sorted[sorted.length - 1].date).toBe(true);
  });
});

// ── insights (derive best opening; analysis-dependent ones null) ────────────
describe('computeInsights', () => {
  it('derives best opening from rows; mistake/accuracy null in v1', () => {
    const rows = sampleGames.map((g) => toGameRowVM(g, true));
    const ins = computeInsights(rows);
    expect(ins.mostCommonMistake).toBeNull();
    expect(ins.avgAccuracy).toBeNull();
    if (ins.bestOpening) expect(ins.bestOpening.winPct).toBeGreaterThanOrEqual(0);
  });

  it('ignores unknown openings/outcomes', () => {
    const g: Game = { ...sampleGames[0], pgn: '1. e4 *', user_color: null, result: '*' };
    const ins = computeInsights([toGameRowVM(g, true)]);
    expect(ins.bestOpening).toBeNull();
  });
});
