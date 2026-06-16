import { describe, it, expect } from 'vitest';
import { detectUserColor } from './userColor';

describe('detectUserColor', () => {
  it('matches display_name to white_player', () => {
    expect(detectUserColor('Alice', 'Bob', 'Alice', null)).toBe('white');
  });

  it('matches display_name to black_player', () => {
    expect(detectUserColor('Bob', 'Alice', 'Alice', null)).toBe('black');
  });

  it('is case-insensitive', () => {
    expect(detectUserColor('ALICE', 'Bob', 'alice', null)).toBe('white');
  });

  it('strips a trailing (rating) tail', () => {
    expect(detectUserColor('Alice (1850)', 'Bob', 'Alice', null)).toBe('white');
  });

  it('strips a trailing space-separated rating', () => {
    expect(detectUserColor('Alice 1850', 'Bob', 'Alice', null)).toBe('white');
  });

  it('falls back to email local-part when display_name is missing', () => {
    expect(detectUserColor('alice42', 'Bob', null, 'alice42@example.com')).toBe('white');
  });

  it('prefers display_name over email when both are present', () => {
    expect(detectUserColor('Alice', 'bob', 'Alice', 'bob@example.com')).toBe('white');
  });

  it('returns null when neither header matches', () => {
    expect(detectUserColor('Alice', 'Bob', 'Charlie', 'charlie@example.com')).toBe(null);
  });

  it('returns null when both candidates are empty', () => {
    expect(detectUserColor('Alice', 'Bob', null, null)).toBe(null);
    expect(detectUserColor('Alice', 'Bob', '', '')).toBe(null);
  });

  it('does not do substring matching', () => {
    // "ace" is a substring of "Alice" but should not match
    expect(detectUserColor('Alice', 'Bob', 'ace', null)).toBe(null);
  });

  it('handles missing white/black gracefully', () => {
    expect(detectUserColor(undefined, 'Alice', 'Alice', null)).toBe('black');
    expect(detectUserColor('Alice', undefined, 'Alice', null)).toBe('white');
    expect(detectUserColor(undefined, undefined, 'Alice', null)).toBe(null);
  });
});
