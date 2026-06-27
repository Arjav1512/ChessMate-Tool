# MIGRATION VERIFICATION REPORT

**Date:** 2026-06-28
**Project:** ChessMate · Supabase `fqlzrkmvhliyuwkpiosp` (region ap-northeast-1)
**Operator:** Claude Code (authorized: "apply all pending migrations, bring the live DB to schema parity, verify")
**Outcome:** ✅ Schema parity achieved. `move_analysis` created + granted. Full real-data loop verified end-to-end with a live account.

---

## 1. Pending migrations identified

`supabase migration list --linked` (before):

| Local | Remote | Status |
|---|---|---|
| 20251017160853 … 20260615030000 (7) | matched | already applied |
| **20260621000000_add_move_analysis** | *(missing)* | **PENDING** |

→ Exactly **one** repo migration was missing on remote: `20260621000000_add_move_analysis.sql`.
(Confirmed independently: `GET /rest/v1/move_analysis` → `404 PGRST205 "Could not find the table"`.)

## 2. Migrations applied (in order)

```
$ supabase db push --linked
Applying migration 20260621000000_add_move_analysis.sql... Finished.
```

Post-apply `migration list` — **fully in sync**:

```
20251017160853 | 20251017160853
20251018000000 | 20251018000000
20251018010000 | 20251018010000
20260615000000 | 20260615000000
20260615010000 | 20260615010000
20260615020000 | 20260615020000
20260615030000 | 20260615030000
20260621000000 | 20260621000000   ← now on remote
```

### 2a. Defect found + fixed during verification — missing table GRANTs

Right after applying, the table existed but **every authenticated read/write returned `403 / 42501 permission denied`**:

```
OWNER (JWT) SELECT move_analysis → 403   {"code":"42501","hint":"GRANT ... TO the current role"}
OWNER (JWT) INSERT move_analysis → 403   42501
OWNER (JWT) SELECT games        → 200    (control — works)
```

**Root cause:** no migration uses explicit `GRANT`; every other table received `anon`/`authenticated` privileges from Supabase's `ALTER DEFAULT PRIVILEGES` (configured for the `postgres` role). `move_analysis` was created by `supabase db push`'s migration login role, which does **not** trigger those defaults — so it shipped with **no API-role grants**. This is exactly why per-move persistence "silently failed" before this task.

**Fix:** added and applied a tracked migration:

`supabase/migrations/20260627000000_grant_move_analysis_privileges.sql`
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.move_analysis TO anon, authenticated;
GRANT ALL ON TABLE public.move_analysis TO service_role;
```
```
$ supabase db push --linked
Applying migration 20260627000000_grant_move_analysis_privileges.sql... Finished.
```

## 3. Table existence verified (SQL via `supabase inspect db`)

`supabase inspect db table-record-counts --linked` — all expected tables present:
`games`, `profiles`, `game_analysis_results`, `user_statistics`, `user_progress_snapshots`,
`api_logs`, **`move_analysis`**.

REST existence probe after migration:
```
move_analysis          → 401 (anon, exists)   [was 404 before]
game_analysis_results  → 401 (exists)
user_statistics        → 401 (exists)
games                  → 401 (exists)
```

## 4. RLS + indexes verified

### Indexes (SQL via `supabase inspect db index-stats --linked`)
All five `move_analysis` indexes from the migration exist on remote:

| Index | Purpose |
|---|---|
| `move_analysis_pkey` | primary key (id) |
| `move_analysis_game_id_ply_key` | `UNIQUE (game_id, ply)` |
| `idx_move_analysis_game_id` | game lookup |
| `idx_move_analysis_user_id` | per-user |
| `idx_move_analysis_user_class` | `(user_id, classification)` weakness queries |

### RLS (behavioral, with a real JWT)
RLS is **enabled** and the four policies (`SELECT/INSERT/UPDATE/DELETE … USING auth.uid() = user_id`)
are enforced — verified by behavior after the grant:

```
anon   SELECT move_analysis → 200 but returns 0 rows   (RLS blocks: no anon policy)
owner  SELECT move_analysis → 200, only the owner's rows
owner  INSERT move_analysis → succeeds (analysis persists; see §5)
```

> Verification queries used: `supabase inspect db table-record-counts/index-stats --linked`
> (run real SQL over the linked connection), plus authenticated PostgREST probes with a
> password-grant JWT for the test user. `supabase db dump` was unavailable (needs Docker),
> so catalog facts were read via `inspect db` + behavioral RLS checks rather than a raw
> `pg_policies` dump.

## 5. End-to-end re-test (live account, real data)

Test user `chessmate.qa+b1test…@gmail.com`; created 1 game earlier + imported 3 more (all White = the user).

| Step | Result |
|---|---|
| Create test user | ✅ signed up + auto-session |
| Import PGN | ✅ 4 games in `games` (`user_color = white` detected) |
| Run analysis (all 4) | ✅ Stockfish ran in-browser on each |
| **move_analysis rows persisted** | ✅ **136 rows** (26 + 37 + 35 + 38) — *was 0 before the grant* |
| `game_analysis_results` | ✅ 4 rows (blunders 2/1/2/0, mistakes 3/4/0/0) |
| Per-move data quality | white moves: 4 mistake, 3 blunder, 34 inaccuracy, 21 good, 4 best, 1 excellent; phases populated (opening 36, middlegame 31); motif tags populated (Hung piece, Allowed material loss) |
| **Review Mistakes loads real data** | ✅ feed shows **7 real mistakes** ("7 of 7 · ranked by what they cost you"), real motifs, real best-moves + cp-loss. (`/tmp/v-mistakes.png`) |
| **Improve loads real weaknesses** | ✅ "Built from 4 analyzed games", focus **"Sharpen your tactics"**, real Weakness Profile (Tactical → recurring blunders, misses tactical wins), real study plan, empty Study Goals (no fake milestones). (`/tmp/v-improve.png`) |
| **Dashboard shows real data** | ✅ Weekly Focus "Sharpen your tactics · **75% of games**" (real 3/4 blunder rate), real "Your plan" top weakness, honest `+0%` delta, zero sample leak. (`/tmp/v-dashboard.png`) |

SQL row-count verification (authenticated REST, owner JWT):
```
move_analysis total                         = 136
move_analysis WHERE color='white' by class  = {inaccuracy:34, mistake:4, good:21, blunder:3, best:4, excellent:1}
move_analysis WHERE color='white' by phase  = {opening:36, middlegame:31}
game_analysis_results                       = 4 rows
```

## 6. Status

- ✅ Live DB is at **schema parity** with the repo; `migration list` fully in sync.
- ✅ `move_analysis` exists with correct RLS + all indexes + working API-role grants.
- ✅ The real-data loop **Import → Analyze → Review Mistakes → Improve → Dashboard** works on real data, with honest empty states when data is insufficient.
- ✅ Repo updated: added `20260627000000_grant_move_analysis_privileges.sql` so a fresh clone gets working grants (the CLI-created-table gap would otherwise recur).

### Notes / follow-ups (not blockers)
1. **Pre-existing accuracy bug (out of scope):** `game_analysis_results.accuracy` is near-0 for all four games despite many good moves — the existing accuracy aggregate (`accuracyFromAvgCpLoss`) looks wrong. Classifications/motifs are correct; this is an analysis-engine tuning issue, not a schema issue.
2. **Test data left in your DB:** the throwaway account + its 4 games + 136 `move_analysis` rows remain (RLS-isolated). Delete the user from the Supabase Auth dashboard to purge it (cascades via FKs).
3. **B-phase app code** that consumes this data lives in PRs #39 (B2), #40 (B3), #41 (B4); this grant migration is on `fix/move-analysis-grants`.
