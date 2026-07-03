/**
 * Accent spinner (System Design §12 loading animations).
 * Decorative by default; pass a `label` to expose an accessible status.
 */
export function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span
      className="iv-spinner"
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
