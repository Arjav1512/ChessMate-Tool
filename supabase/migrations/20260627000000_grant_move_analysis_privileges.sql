/*
  # Grant API-role privileges on move_analysis

  The `move_analysis` table (20260621000000) was created via `supabase db push`,
  whose migration login role does NOT trigger Supabase's `ALTER DEFAULT
  PRIVILEGES` (those are configured for the `postgres` role). Every other public
  table received `anon`/`authenticated` grants from those defaults, but
  move_analysis was created WITHOUT them — so the API roles got `42501 permission
  denied for table move_analysis` on every read/write, even though its RLS
  policies were correct.

  This grant lets the API roles reach the table at all; row-level access stays
  gated by the existing RLS policies (`auth.uid() = user_id`). Idempotent and
  additive — safe to run on any environment, and required for a fresh clone where
  the same CLI-created-table gap would otherwise recur.
*/

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.move_analysis TO anon, authenticated;
GRANT ALL ON TABLE public.move_analysis TO service_role;
