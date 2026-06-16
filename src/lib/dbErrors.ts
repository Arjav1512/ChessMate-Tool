import type { PostgrestError } from '@supabase/supabase-js';

export interface TranslatedDbError {
  /** Short, user-facing toast text. */
  message: string;
  /** Longer developer-facing details for the console / Sentry. */
  detail: string;
  /** Short, stable code we can act on or test against. */
  code:
    | 'MISSING_COLUMN'
    | 'MISSING_TABLE'
    | 'FK_VIOLATION'
    | 'CHECK_VIOLATION'
    | 'UNIQUE_VIOLATION'
    | 'RLS_DENIED'
    | 'NOT_AUTHENTICATED'
    | 'NETWORK'
    | 'UNKNOWN';
}

/**
 * Translate a PostgrestError (or anything that looks like one) into a
 * concrete, user-actionable message. The Supabase JS client returns
 * structured Postgres SQLSTATE codes; we map the ones we can hit during
 * import / profile work into messages a user can act on.
 *
 * SQLSTATE reference:
 *   23503 — foreign_key_violation
 *   23505 — unique_violation
 *   23514 — check_violation
 *   42703 — undefined_column
 *   42P01 — undefined_table
 *   42501 — insufficient_privilege (often surfaced as RLS denial)
 *   PGRST301/PGRST116 — PostgREST "no rows" / RLS-shaped responses
 */
export function translateDbError(
  err: PostgrestError | { message?: string; code?: string } | null | undefined,
): TranslatedDbError {
  if (!err) {
    return {
      message: 'Unknown database error',
      detail: 'translateDbError called with null',
      code: 'UNKNOWN',
    };
  }

  const sqlstate = (err as PostgrestError).code ?? '';
  const raw = err.message ?? '';
  const lc = raw.toLowerCase();

  if (sqlstate === '42703' || (lc.includes('column') && lc.includes('does not exist'))) {
    return {
      message:
        'The database schema is out of date. Ask your administrator to apply the latest migrations (npx supabase db push).',
      detail: raw,
      code: 'MISSING_COLUMN',
    };
  }

  if (sqlstate === '42P01' || (lc.includes('relation') && lc.includes('does not exist'))) {
    return {
      message:
        'The database is missing a required table. Run `npx supabase db push` against your project.',
      detail: raw,
      code: 'MISSING_TABLE',
    };
  }

  if (sqlstate === '23503') {
    return {
      message:
        "Your profile row doesn't exist yet in this project. Try signing out and back in — that re-runs profile creation.",
      detail: raw,
      code: 'FK_VIOLATION',
    };
  }

  if (sqlstate === '23514') {
    return {
      message: 'A field has an invalid value (database CHECK constraint rejected the row).',
      detail: raw,
      code: 'CHECK_VIOLATION',
    };
  }

  if (sqlstate === '23505') {
    return {
      message: 'This row already exists.',
      detail: raw,
      code: 'UNIQUE_VIOLATION',
    };
  }

  if (
    sqlstate === '42501' ||
    sqlstate === 'PGRST301' ||
    sqlstate === 'PGRST116' ||
    lc.includes('row-level security') ||
    lc.includes('row level security') ||
    lc.includes('permission denied')
  ) {
    return {
      message:
        "Your account doesn't have permission to write this row. Sign out and back in, then retry — if it persists, check Supabase RLS policies.",
      detail: raw,
      code: 'RLS_DENIED',
    };
  }

  if (lc.includes('jwt') || lc.includes('not authenticated')) {
    return {
      message: 'Your session expired. Sign in again and retry.',
      detail: raw,
      code: 'NOT_AUTHENTICATED',
    };
  }

  if (lc.includes('failed to fetch') || lc.includes('network')) {
    return {
      message: 'Network error talking to the database. Check your connection and retry.',
      detail: raw,
      code: 'NETWORK',
    };
  }

  return {
    message: raw || 'Database error',
    detail: raw,
    code: 'UNKNOWN',
  };
}
