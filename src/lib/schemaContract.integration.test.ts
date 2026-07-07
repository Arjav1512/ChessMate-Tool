// @vitest-environment node
// PGlite needs Node's filesystem APIs (see rls.integration.test.ts).
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Schema contract: every column the client's Supabase queries reference must
// exist in the REAL migrated schema.
//
// Why: PostgREST fails the whole request when a select names a missing column,
// and the app renders that as a page-level error. Exactly this shipped once —
// Insights selected `game_analysis_results.created_at` (the column is
// `analyzed_at`), so the page errored for every authenticated user. Unit tests
// can't catch it (they mock supabase); this suite runs the real migrations on
// an in-process Postgres and executes each column list as a `LIMIT 0` select.
//
// When you change a client query's column list, update the manifest below —
// that's the point: the diff forces the schema check.
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

const AUTH_SHIM = `
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
`;

/**
 * Table → the exact column lists the client passes to `.select()` / writes via
 * insert/upsert, one entry per call site. Source files noted for maintenance.
 */
const QUERIED_COLUMNS: Record<string, { source: string; columns: string }[]> = {
  games: [
    { source: 'features/insights/useInsights.ts', columns: 'id, user_color, white_player, black_player, result, date, created_at' },
    { source: 'hooks/useWeaknessProfile.ts', columns: 'id, result, user_color, pgn, uploaded_at' },
    { source: 'hooks/useMistakeReview.ts', columns: 'id, user_color' },
    { source: 'features/games/useImportGames.ts (dedupe)', columns: 'white_player, black_player, date, result' },
    { source: 'features/games/useImportGames.ts (insert)', columns: 'user_id, pgn, white_player, black_player, result, date, event, user_color' },
  ],
  game_analysis_results: [
    { source: 'features/insights/useInsights.ts', columns: 'game_id, accuracy, total_moves, mistakes, inaccuracies, blunders, analyzed_at' },
    { source: 'hooks/useWeaknessProfile.ts', columns: 'game_id, accuracy, mistakes, inaccuracies, blunders, total_moves' },
    { source: 'features/analysis/hooks.ts (upsert)', columns: 'game_id, user_id, accuracy, total_moves, mistakes, inaccuracies, blunders, good_moves, best_moves, average_centipawn_loss' },
    { source: 'components/stats/ProgressBar.tsx', columns: 'game_id, accuracy, mistakes, inaccuracies, blunders, good_moves, best_moves' },
    { source: 'components/stats/StatsDashboard.tsx', columns: 'accuracy, mistakes, blunders' },
  ],
  move_analysis: [
    { source: 'features/analysis/hooks.ts', columns: 'game_id, user_id, ply, move_number, color, fen, san, eval_cp, cp_loss, classification, best_move, phase, motif_tags' },
    { source: 'hooks/useMistakeReview.ts', columns: 'game_id, fen, san, best_move, cp_loss, phase, motif_tags, move_number, color, classification' },
    { source: 'hooks/useWeaknessProfile.ts', columns: 'game_id, color, phase, classification, motif_tags' },
    { source: 'features/insights/useInsights.ts', columns: 'classification, phase' },
  ],
  profiles: [
    { source: 'features/games/useImportGames.ts', columns: 'display_name' },
  ],
};

describe('schema contract (client queries vs real migrations)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_SHIM);
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) await db.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf-8'));
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  for (const [table, queries] of Object.entries(QUERIED_COLUMNS)) {
    for (const q of queries) {
      it(`${table}: columns used by ${q.source} exist`, async () => {
        // LIMIT 0 → validates every named column without needing rows.
        await expect(db.query(`SELECT ${q.columns} FROM ${table} LIMIT 0`)).resolves.toBeDefined();
      });
    }
  }

  it('REGRESSION: game_analysis_results has analyzed_at, not created_at', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'game_analysis_results'`,
    );
    const cols = rows.map((r) => r.column_name);
    expect(cols).toContain('analyzed_at');
    expect(cols).not.toContain('created_at'); // Insights must not order by it
  });
});
