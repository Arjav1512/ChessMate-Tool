import { describe, expect, it } from 'vitest';
import { addDays, diffLocalDays, localDayKey, localMonthKey, parseLocalDay } from './dates';

describe('dates — local-day utilities (audit L4)', () => {
  it('localDayKey formats a local calendar day zero-padded', () => {
    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('parseLocalDay round-trips with localDayKey at local midnight (no UTC off-by-one)', () => {
    const key = '2026-03-09';
    const d = parseLocalDay(key);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(0);
    expect(localDayKey(d)).toBe(key);
  });

  it('addDays crosses month and year boundaries', () => {
    expect(localDayKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(localDayKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(localDayKey(addDays(new Date(2026, 2, 1), -1))).toBe('2026-02-28');
  });

  it('diffLocalDays counts calendar days, not elapsed time', () => {
    expect(diffLocalDays(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(1);
    expect(diffLocalDays(new Date(2026, 0, 2), new Date(2026, 0, 1))).toBe(-1);
    expect(diffLocalDays(new Date(2026, 0, 1), new Date(2026, 0, 1))).toBe(0);
  });

  it('diffLocalDays is exactly 1 across a US spring-forward DST boundary', () => {
    // 2026-03-08 02:00 is the US DST spring-forward (that local day is 23h).
    // A naive (b-a)/86_400_000 would yield ~0.96 here; the date-anchored diff
    // must be exactly 1 so a streak spanning the change does not reset.
    expect(diffLocalDays(new Date(2026, 2, 8), new Date(2026, 2, 9))).toBe(1);
    // And across the autumn fall-back (25h day) it must still be 1.
    expect(diffLocalDays(new Date(2026, 10, 1), new Date(2026, 10, 2))).toBe(1);
  });

  it('localMonthKey formats YYYY-MM', () => {
    expect(localMonthKey(new Date(2026, 6, 8))).toBe('2026-07');
  });
});
