import { describe, it, expect } from 'vitest';
import { translateDbError } from './dbErrors';

describe('translateDbError', () => {
  it('detects undefined_column (42703)', () => {
    const r = translateDbError({ code: '42703', message: 'column "user_color" does not exist' });
    expect(r.code).toBe('MISSING_COLUMN');
    expect(r.message).toMatch(/schema is out of date/i);
  });

  it('detects undefined_table (42P01)', () => {
    const r = translateDbError({ code: '42P01', message: 'relation "games" does not exist' });
    expect(r.code).toBe('MISSING_TABLE');
  });

  it('detects foreign-key violation (23503) and points at profile creation', () => {
    const r = translateDbError({ code: '23503', message: 'insert violates fk games_user_id_fkey' });
    expect(r.code).toBe('FK_VIOLATION');
    expect(r.message).toMatch(/profile/i);
  });

  it('detects check-constraint violation (23514)', () => {
    const r = translateDbError({ code: '23514', message: 'violates check constraint games_user_color_check' });
    expect(r.code).toBe('CHECK_VIOLATION');
  });

  it('detects unique violation (23505)', () => {
    const r = translateDbError({ code: '23505', message: 'duplicate key' });
    expect(r.code).toBe('UNIQUE_VIOLATION');
  });

  it('detects RLS denial via permission text', () => {
    const r = translateDbError({ message: 'new row violates row-level security policy' });
    expect(r.code).toBe('RLS_DENIED');
  });

  it('detects RLS denial via PGRST116', () => {
    const r = translateDbError({ code: 'PGRST116', message: 'not found' });
    expect(r.code).toBe('RLS_DENIED');
  });

  it('detects JWT expiry as auth error', () => {
    const r = translateDbError({ message: 'JWT expired' });
    expect(r.code).toBe('NOT_AUTHENTICATED');
  });

  it('detects network failure', () => {
    const r = translateDbError({ message: 'Failed to fetch' });
    expect(r.code).toBe('NETWORK');
  });

  it('falls back to UNKNOWN when nothing matches', () => {
    const r = translateDbError({ message: 'something weird' });
    expect(r.code).toBe('UNKNOWN');
    expect(r.message).toBe('something weird');
  });

  it('handles null input safely', () => {
    const r = translateDbError(null);
    expect(r.code).toBe('UNKNOWN');
  });
});
