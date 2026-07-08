/**
 * Timezone-safe local-day utilities (audit L4).
 *
 * Streaks, heatmaps, and "this month" counts are reasoned about in the user's
 * *local calendar days* — the unit a person actually experiences. Doing that
 * arithmetic ad hoc invites two classic bugs, both of which existed before this
 * module:
 *
 *   1. Millisecond day-diffing (`b - a === 86_400_000`) breaks across a
 *      daylight-saving transition, when a local day is 23h or 25h long — a
 *      streak spanning the change would silently reset.
 *   2. Parsing `"YYYY-MM-DD"` with `new Date(key)` yields UTC midnight, which
 *      is the *previous* calendar day for anyone west of UTC.
 *
 * Everything here works in local time consistently, and day distance is counted
 * by calendar date (via a UTC-noon anchor), so it is DST-proof.
 */

/** Local calendar day as `YYYY-MM-DD` (the heatmap/streak key). */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` key back to local midnight (NOT UTC — avoids off-by-one). */
export function parseLocalDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** A new Date `n` calendar days from `d` (n may be negative). DST-safe. */
export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/**
 * Whole calendar days between two dates (`b - a`), counting by date rather than
 * elapsed milliseconds so a DST transition can't make it 0.96 or 1.04. Anchors
 * each date at UTC noon, where a ±1h DST shift can never cross a day boundary.
 */
export function diffLocalDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), 12);
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), 12);
  return Math.round((ub - ua) / 86_400_000);
}

/** `YYYY-MM` for the given date, in local time. */
export function localMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
