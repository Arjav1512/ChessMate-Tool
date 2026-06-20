// @vitest-environment node
// PGlite loads its Postgres WASM + data bundle via Node's filesystem; the
// project-default jsdom environment lacks the APIs it needs (arrayBuffer on the
// bundle response), so this suite runs under node.
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// RLS / auth integration tests.
//
// These run the REAL migrations against an in-process Postgres (PGlite, no Docker
// / no external Supabase) and assert the row-level-security boundary end to end:
// one authenticated user cannot read or write another user's rows, WITH CHECK
// blocks spoofed user_ids, and the statistics trigger computes W/L/D from
// games.user_color. RLS is THE security boundary (see SECURITY.md), so it earns a
// real test rather than only the structural checks in migrations.test.ts.
//
// Supabase provides auth.uid()/auth.users and the anon/authenticated/service_role
// roles; we recreate the minimum of that scaffolding so the unmodified migrations
// apply and behave as they do in production.
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

const AUTH_SHIM = `
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);

-- Mirror Supabase's auth.uid(): the 'sub' claim from the request JWT, as uuid.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
`;

const GRANTS = `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
`;

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

async function applyMigrations(db: PGlite) {
  await db.exec(AUTH_SHIM);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf-8'));
  }
  await db.exec(GRANTS);
}

/** Run a block as a specific authenticated user (RLS enforced). */
async function asUser(db: PGlite, userId: string) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
  await db.exec('SET ROLE authenticated');
}

/** Drop back to the superuser (no RLS) for fixture setup. */
async function asAdmin(db: PGlite) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claims', '', false)`);
}

describe('RLS / auth integration (real migrations on PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await applyMigrations(db);
    // Seed auth.users + profiles for two users (as superuser — pre-app state).
    await asAdmin(db);
    await db.exec(`INSERT INTO auth.users (id, email) VALUES
      ('${USER_A}', 'a@example.com'), ('${USER_B}', 'b@example.com')`);
    await db.exec(`INSERT INTO profiles (id, email, display_name) VALUES
      ('${USER_A}', 'a@example.com', 'A'), ('${USER_B}', 'b@example.com', 'B')`);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  it('sanity: auth.uid() reflects the active JWT claim', async () => {
    await asUser(db, USER_A);
    const r = await db.query<{ uid: string }>('SELECT auth.uid() AS uid');
    expect(r.rows[0].uid).toBe(USER_A);
  });

  it('a user cannot SELECT another user’s games', async () => {
    await asUser(db, USER_A);
    await db.exec(`INSERT INTO games (user_id, pgn, result, user_color)
      VALUES ('${USER_A}', '1. e4 e5', '1-0', 'white')`);

    // B sees none of A's games.
    await asUser(db, USER_B);
    const bView = await db.query(`SELECT * FROM games`);
    expect(bView.rows).toHaveLength(0);

    // A sees their own.
    await asUser(db, USER_A);
    const aView = await db.query(`SELECT * FROM games`);
    expect(aView.rows).toHaveLength(1);
  });

  it('WITH CHECK blocks inserting a game spoofed as another user', async () => {
    await asUser(db, USER_B);
    await expect(
      db.exec(`INSERT INTO games (user_id, pgn, result) VALUES ('${USER_A}', '1. d4', '*')`),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a user cannot UPDATE or DELETE another user’s game', async () => {
    // A owns exactly one game (from the SELECT test).
    await asUser(db, USER_A);
    const gid = (await db.query<{ id: string }>(`SELECT id FROM games LIMIT 1`)).rows[0].id;

    await asUser(db, USER_B);
    const upd = await db.query(`UPDATE games SET result = '0-1' WHERE id = '${gid}'`);
    expect(upd.affectedRows).toBe(0); // RLS filters the row out — nothing updated
    const del = await db.query(`DELETE FROM games WHERE id = '${gid}'`);
    expect(del.affectedRows).toBe(0);
  });

  it('moves are isolated through the games ownership join', async () => {
    await asUser(db, USER_A);
    const gid = (await db.query<{ id: string }>(`SELECT id FROM games LIMIT 1`)).rows[0].id;
    await db.exec(`INSERT INTO moves (game_id, move_number, position_fen)
      VALUES ('${gid}', 1, 'startpos')`);

    await asUser(db, USER_B);
    const bMoves = await db.query(`SELECT * FROM moves`);
    expect(bMoves.rows).toHaveLength(0);

    // B cannot insert a move onto A's game either.
    await expect(
      db.exec(`INSERT INTO moves (game_id, move_number, position_fen)
        VALUES ('${gid}', 2, 'x')`),
    ).rejects.toThrow(/row-level security/i);
  });

  it('api_logs are visible only to their owner', async () => {
    // Service role (edge function) writes a log for A.
    await asAdmin(db);
    await db.exec('SET ROLE service_role');
    await db.exec(`INSERT INTO api_logs (user_id, endpoint, success)
      VALUES ('${USER_A}', 'chess-mentor', true)`);
    await db.exec('RESET ROLE');

    await asUser(db, USER_B);
    expect((await db.query(`SELECT * FROM api_logs`)).rows).toHaveLength(0);
    await asUser(db, USER_A);
    expect((await db.query(`SELECT * FROM api_logs`)).rows).toHaveLength(1);
  });

  it('the statistics trigger derives W/L/D from games.user_color', async () => {
    // Fresh user to keep counts deterministic.
    const u = '33333333-3333-3333-3333-333333333333';
    await asAdmin(db);
    await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${u}', 'c@example.com')`);
    await db.exec(`INSERT INTO profiles (id, email, display_name) VALUES ('${u}', 'c@example.com', 'C')`);

    await asUser(db, u);
    // win (white, 1-0), loss (black, 1-0), draw (white, 1/2-1/2)
    await db.exec(`INSERT INTO games (user_id, pgn, result, user_color) VALUES
      ('${u}', 'g1', '1-0', 'white'),
      ('${u}', 'g2', '1-0', 'black'),
      ('${u}', 'g3', '1/2-1/2', 'white')`);
    const gid = (await db.query<{ id: string }>(`SELECT id FROM games WHERE pgn='g1'`)).rows[0].id;
    // Inserting an analysis row fires update_user_statistics(), which recomputes
    // across all of the user's games.
    await db.exec(`INSERT INTO game_analysis_results (game_id, user_id, accuracy, mistakes, blunders)
      VALUES ('${gid}', '${u}', 90.0, 1, 0)`);

    const stats = (await db.query<{
      wins: number; losses: number; draws: number; games_as_white: number; games_as_black: number;
    }>(`SELECT wins, losses, draws, games_as_white, games_as_black FROM user_statistics WHERE user_id='${u}'`)).rows[0];

    expect(Number(stats.wins)).toBe(1);
    expect(Number(stats.losses)).toBe(1);
    expect(Number(stats.draws)).toBe(1);
    expect(Number(stats.games_as_white)).toBe(2);
    expect(Number(stats.games_as_black)).toBe(1);
  });
});
