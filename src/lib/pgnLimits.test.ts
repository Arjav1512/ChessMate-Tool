import { describe, it, expect } from 'vitest';
import { checkPgnSize, MAX_PGN_BYTES } from './pgnLimits';

// Build a string whose UTF-8 byte length is exactly `bytes` by using
// 1-byte ASCII characters.
function ascii(bytes: number): string {
  return 'a'.repeat(bytes);
}

describe('checkPgnSize', () => {
  describe('paste path', () => {
    it('accepts a string well below the limit', () => {
      const result = checkPgnSize(ascii(1024), 'pasted text');
      expect(result.ok).toBe(true);
    });

    it('accepts a string exactly at the limit', () => {
      const result = checkPgnSize(ascii(MAX_PGN_BYTES), 'pasted text');
      expect(result.ok).toBe(true);
    });

    it('accepts a string one byte below the limit', () => {
      const result = checkPgnSize(ascii(MAX_PGN_BYTES - 1), 'pasted text');
      expect(result.ok).toBe(true);
    });

    it('rejects a string one byte above the limit', () => {
      const result = checkPgnSize(ascii(MAX_PGN_BYTES + 1), 'pasted text');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.bytes).toBe(MAX_PGN_BYTES + 1);
        expect(result.message).toMatch(/limit is 5 MB/);
        expect(result.message).toMatch(/paste fewer/i);
      }
    });

    it('rejects a string far above the limit', () => {
      const result = checkPgnSize(ascii(MAX_PGN_BYTES * 2), 'pasted text');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.bytes).toBe(MAX_PGN_BYTES * 2);
      }
    });
  });

  describe('file path', () => {
    it('accepts a Blob exactly at the limit', () => {
      const blob = new Blob([new Uint8Array(MAX_PGN_BYTES)]);
      const result = checkPgnSize(blob, 'file');
      expect(result.ok).toBe(true);
    });

    it('accepts a Blob just below the limit', () => {
      const blob = new Blob([new Uint8Array(MAX_PGN_BYTES - 100)]);
      const result = checkPgnSize(blob, 'file');
      expect(result.ok).toBe(true);
    });

    it('rejects a Blob one byte above the limit', () => {
      const blob = new Blob([new Uint8Array(MAX_PGN_BYTES + 1)]);
      const result = checkPgnSize(blob, 'file');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.bytes).toBe(MAX_PGN_BYTES + 1);
        expect(result.message).toMatch(/limit is 5 MB/);
        expect(result.message).toMatch(/split it/i);
      }
    });
  });

  describe('byte counting', () => {
    it('counts multi-byte UTF-8 characters by byte length, not by JS string length', () => {
      // '😀' is 4 UTF-8 bytes; build a string whose .length is small but
      // whose byte-length exceeds the limit.
      const emoji = '😀'; // 4 bytes
      const count = Math.ceil(MAX_PGN_BYTES / 4) + 1; // > limit by bytes
      const big = emoji.repeat(count);
      expect(big.length).toBeLessThan(MAX_PGN_BYTES);
      const result = checkPgnSize(big, 'pasted text');
      expect(result.ok).toBe(false);
    });
  });

  describe('source label', () => {
    it('defaults to the pasted-text message when omitted', () => {
      const result = checkPgnSize(ascii(MAX_PGN_BYTES + 1));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/paste fewer/i);
      }
    });
  });
});
