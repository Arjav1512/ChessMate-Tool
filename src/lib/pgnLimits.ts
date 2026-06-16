/**
 * Hard cap on the size of a single PGN upload/paste. Both the file-upload
 * and paste-text paths must enforce this — see `GameList.tsx`.
 *
 * The limit protects the browser from spending minutes parsing pathological
 * inputs and the Supabase tier from individual rows that would exceed the
 * column/HTTP limits.
 */
export const MAX_PGN_BYTES = 5 * 1024 * 1024; // 5 MiB

export interface PgnSizeCheckOk {
  ok: true;
}

export interface PgnSizeCheckErr {
  ok: false;
  bytes: number;
  /** A user-facing message ready to display in a toast. */
  message: string;
}

export type PgnSizeCheck = PgnSizeCheckOk | PgnSizeCheckErr;

/**
 * Returns ok=true iff the input is at-or-below the limit. The limit is
 * inclusive: a PGN whose UTF-8 byte length equals `MAX_PGN_BYTES`
 * passes; one byte more fails.
 */
export function checkPgnSize(
  input: string | Blob,
  source: 'file' | 'pasted text' = 'pasted text',
): PgnSizeCheck {
  const bytes = typeof input === 'string' ? new Blob([input]).size : input.size;
  if (bytes <= MAX_PGN_BYTES) return { ok: true };

  const mib = (bytes / 1024 / 1024).toFixed(1);
  return {
    ok: false,
    bytes,
    message:
      source === 'file'
        ? `That PGN is ${mib} MB. The limit is 5 MB — split it into smaller files and import them separately.`
        : `That PGN is ${mib} MB. The limit is 5 MB — paste fewer games or upload as a file split.`,
  };
}
