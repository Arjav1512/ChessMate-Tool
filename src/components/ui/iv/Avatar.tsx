export interface AvatarProps {
  src?: string | null;
  /** Name used for the alt text and the initials fallback. */
  name: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar (System Design §6 Profile) — image with initials fallback.
 * Uses the standard accessible pattern: container `role="img"` carries the
 * name; inner content is decorative (`aria-hidden`), so screen readers announce
 * the name once and axe sees a valid labelled image.
 */
export function Avatar({ src, name, size = 32, className = '' }: AvatarProps) {
  return (
    <span
      className={`iv-avatar ${className}`}
      role="img"
      aria-label={name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {src ? <img src={src} alt="" aria-hidden /> : <span aria-hidden>{initials(name)}</span>}
    </span>
  );
}
