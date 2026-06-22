import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Phase 1 acceptance guard: the Ivory token system must reproduce
 * CHESSMATE_SYSTEM_DESIGN.md §5 verbatim. These assertions read the actual
 * stylesheet so any accidental drift in a locked token value fails CI.
 * (jsdom does not resolve linked CSS custom properties, so we assert source.)
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

/** Match a `--token: value;` declaration regardless of surrounding whitespace. */
function decl(token: string, value: string) {
  const re = new RegExp(
    `${token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*${value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*;`,
  );
  return re.test(css);
}

describe('Ivory design tokens (§5)', () => {
  it('§5.1 surfaces — dark', () => {
    expect(decl('--bg', '#0C0B0A')).toBe(true);
    expect(decl('--surface-1', '#131110')).toBe(true);
    expect(decl('--surface-2', '#161412')).toBe(true);
    expect(decl('--surface-3', '#1D1A17')).toBe(true);
    expect(decl('--surface-elev', '#242019')).toBe(true);
  });

  it('§5.1 text — dark', () => {
    expect(decl('--text-hi', '#F6F3EE')).toBe(true);
    expect(decl('--text-body', '#E9E3D9')).toBe(true);
    expect(decl('--text-mid', '#B0A89D')).toBe(true);
    expect(decl('--text-low', '#8F877B')).toBe(true);
    expect(decl('--text-faint', '#726B61')).toBe(true);
  });

  it('§5.1 accent — ivory (default)', () => {
    expect(decl('--accent', '#EBD9B8')).toBe(true);
    expect(decl('--accent-bright', '#F6F3EE')).toBe(true);
    expect(decl('--on-accent', '#1A1814')).toBe(true);
    expect(decl('--accent-glow', 'rgba(224, 178, 110, 0.12)')).toBe(true);
  });

  it('§5.1 move quality — fixed palette', () => {
    expect(decl('--mq-brilliant', '#6FBE85')).toBe(true);
    expect(decl('--mq-best', '#4FB6A8')).toBe(true);
    expect(decl('--mq-good', '#B4AB9C')).toBe(true);
    expect(decl('--mq-inaccuracy', '#E0AE45')).toBe(true);
    expect(decl('--mq-mistake', '#DD8442')).toBe(true);
    expect(decl('--mq-blunder', '#D85B4A')).toBe(true);
  });

  it('§5.1 semantic', () => {
    expect(decl('--success', '#6FBE85')).toBe(true);
    expect(decl('--warning', '#E0AE45')).toBe(true);
    expect(decl('--error', '#D85B4A')).toBe(true);
    expect(decl('--info', '#7BA6C4')).toBe(true);
  });

  it('§5.1 board — wood default', () => {
    expect(decl('--board-light', '#E7DDC8')).toBe(true);
    expect(decl('--board-dark', '#8A7C66')).toBe(true);
    expect(decl('--piece-white', '#FAF6EE')).toBe(true);
    expect(decl('--piece-black', '#2A251E')).toBe(true);
  });

  it('§5.2 light theme overrides', () => {
    expect(css).toMatch(/\[data-theme="light"\]/);
    expect(decl('--bg', '#F4F1EA')).toBe(true);
    expect(decl('--surface-1', '#FBF9F4')).toBe(true);
    expect(decl('--text-hi', '#211D17')).toBe(true);
  });

  it('§5.3 type families', () => {
    expect(css).toMatch(/--font-sans:\s*'Onest'/);
    expect(css).toMatch(/--font-mono:\s*'JetBrains Mono'/);
  });

  it('§5.5 radii', () => {
    expect(decl('--r-xs', '6px')).toBe(true);
    expect(decl('--r-sm', '7px')).toBe(true);
    expect(decl('--r-pill', '999px')).toBe(true);
  });

  it('§5.10 theme tweaks present (accent / board / density)', () => {
    expect(css).toMatch(/\[data-accent="periwinkle"\]/);
    expect(decl('--accent', '#C7CCFF')).toBe(true); // periwinkle
    expect(decl('--accent', '#BBD0B0')).toBe(true); // sage
    expect(decl('--accent', '#E3B79A')).toBe(true); // clay
    expect(css).toMatch(/\[data-board="slate"\]/);
    expect(css).toMatch(/\[data-board="tournament"\]/);
    expect(css).toMatch(/\[data-density="cozy"\]\s*\{\s*--content-max:\s*960px/);
    expect(css).toMatch(/\[data-density="spacious"\]\s*\{\s*--content-max:\s*1280px/);
  });

  it('§5.9 focus ring', () => {
    expect(decl('--focus-ring', '0 0 0 3px rgba(235, 217, 184, 0.12)')).toBe(true);
  });
});
