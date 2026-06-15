/**
 * Decide which side of a PGN the user was playing, given the headers
 * and the candidate handles we know them by (display_name and email
 * local-part). Returns null when nothing matches — callers must NOT
 * fall back to "left side wins by default" or rough 50/50 splits.
 *
 * Matching is conservative: case-insensitive exact match after
 * trimming and stripping a trailing rating tail ("(1500)" or
 * " 1500"). Substring matching is intentionally avoided because
 * short display names ("ace", "kj") would match too much.
 */

function normalize(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/\s*\(\d+\)\s*$/, '')   // " (1500)"
    .replace(/\s+\d+\s*$/, '');      // trailing " 1500"
}

export function detectUserColor(
  whitePlayer: string | undefined,
  blackPlayer: string | undefined,
  displayName: string | null | undefined,
  email: string | null | undefined,
): 'white' | 'black' | null {
  const candidates: string[] = [];
  const dn = normalize(displayName);
  if (dn) candidates.push(dn);
  if (email) {
    const local = normalize(email.split('@')[0]);
    if (local && !candidates.includes(local)) candidates.push(local);
  }
  if (candidates.length === 0) return null;

  const w = normalize(whitePlayer);
  const b = normalize(blackPlayer);

  if (w && candidates.includes(w)) return 'white';
  if (b && candidates.includes(b)) return 'black';

  return null;
}
