import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Migration regression tests.
//
// These tests do NOT spin up a real Postgres — running migrations end-to-end
// requires Supabase / `supabase db push` and a live database, which is not
// available in unit-test land. They run a set of structural checks that
// catch the regressions most likely to bite us:
//
//   1. Migration files have sortable timestamps so `supabase db push`
//      applies them in the intended order.
//   2. The current statistics trigger reads games.user_color (column added
//      in 2026-06-15) instead of fuzzy-matching profiles.display_name
//      against PGN headers — the regression the 030000 migration fixes.
//   3. Critical RLS clauses are present on user-owned tables.
//   4. The user_color CHECK constraint and index exist.
//
// Anything that needs a live DB — actually running a trigger, asserting
// derived statistics, checking RLS at the SQL level — is documented in
// docs/database-validation.md (or CONTRIBUTING.md) so a future engineer
// with a Supabase project can wire these up against real infra.
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function read(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8');
}

describe('migration files', () => {
  it('all migrations have a 14-digit timestamp prefix', () => {
    const files = listMigrations();
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    }
  });

  it('timestamps are monotonically increasing in lexical order', () => {
    const files = listMigrations();
    const timestamps = files.map((f) => f.slice(0, 14));
    const sorted = [...timestamps].sort();
    expect(timestamps).toEqual(sorted);
  });

  it('the user_color migration precedes the trigger rewrite', () => {
    const files = listMigrations();
    const userColorIdx = files.findIndex((f) =>
      f.includes('add_user_color_to_games'),
    );
    const triggerIdx = files.findIndex((f) =>
      f.includes('rewrite_stats_trigger_on_user_color'),
    );
    expect(userColorIdx).toBeGreaterThan(-1);
    expect(triggerIdx).toBeGreaterThan(-1);
    expect(triggerIdx).toBeGreaterThan(userColorIdx);
  });
});

describe('user_color column migration', () => {
  const sql = read('20260615020000_add_user_color_to_games.sql');

  it('adds a user_color column to games', () => {
    expect(sql).toMatch(/ALTER TABLE games\s+ADD COLUMN IF NOT EXISTS user_color/i);
  });

  it('enforces user_color ∈ {white, black, NULL} via CHECK constraint', () => {
    expect(sql).toMatch(/games_user_color_check/);
    expect(sql).toMatch(/CHECK \(user_color IN \('white', 'black'\) OR user_color IS NULL\)/);
  });

  it('creates a composite index on (user_id, user_color)', () => {
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_games_user_color\s+ON games\(user_id, user_color\)/i,
    );
  });

  it('does not back-fill user_color (avoids SQL/TS drift)', () => {
    // The migration explicitly forbids a SQL backfill — backfills must be
    // driven by detectUserColor() in src/lib/userColor.ts.
    expect(sql).not.toMatch(/^\s*UPDATE games\s+SET user_color/im);
  });
});

describe('user statistics trigger (post user_color rewrite)', () => {
  const sql = read('20260615030000_rewrite_stats_trigger_on_user_color.sql');

  it('replaces the existing function with CREATE OR REPLACE', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION update_user_statistics/);
  });

  it('uses games.user_color for the games_as_white / games_as_black split', () => {
    expect(sql).toMatch(/user_color = 'white'/);
    expect(sql).toMatch(/user_color = 'black'/);
  });

  it('does NOT fall back to LOWER(white_player) string matching against display_name', () => {
    // The previous trigger used LOWER(white_player) ILIKE display_name etc.
    // Any reappearance of that pattern resurrects the H-4/H-7 bug.
    expect(sql).not.toMatch(/LOWER\s*\(\s*white_player/i);
    expect(sql).not.toMatch(/LOWER\s*\(\s*black_player/i);
    expect(sql).not.toMatch(/display_name\s+ILIKE/i);
  });

  it('counts W/L/D only when user_color is resolved (excludes NULL games)', () => {
    // Wins clause references user_color = 'white' AND result = '1-0' OR
    // user_color = 'black' AND result = '0-1'. Draws explicitly filter
    // user_color IN ('white', 'black').
    expect(sql).toMatch(/user_color = 'white' AND result = '1-0'/);
    expect(sql).toMatch(/user_color = 'black' AND result = '0-1'/);
    expect(sql).toMatch(/user_color IN \('white', 'black'\)/);
  });

  it('runs with SECURITY DEFINER (statistics are read by RLS-protected views)', () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
  });
});

describe('core schema (RLS enforcement)', () => {
  const sql = read('20251017160853_create_chessmate_schema.sql');

  it('enables RLS on every user-owned table', () => {
    for (const table of ['profiles', 'games', 'moves', 'questions']) {
      const re = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, 'i');
      expect(sql).toMatch(re);
    }
  });

  it('cascades profile deletes from auth.users', () => {
    expect(sql).toMatch(
      /REFERENCES auth\.users\(id\)\s+ON DELETE CASCADE/i,
    );
  });

  it('games.user_id has a foreign key to profiles (the FK that gated H7)', () => {
    expect(sql).toMatch(/user_id uuid (?:NOT NULL )?REFERENCES profiles/i);
  });
});
