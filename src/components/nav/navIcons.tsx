import {
  LayoutDashboard,
  Activity,
  Library,
  ScanSearch,
  TrendingUp,
  Sparkles,
  User,
  Settings,
  Crosshair,
  LineChart,
  Upload,
  Target,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

/**
 * Central nav icon map — one source so the sidebar, bottom tab bar, user menu
 * and ⌘K stay visually consistent. Replaces the ad-hoc unicode glyphs (◉ ▦ ◎ ▲…)
 * that read as unprofessional. Keyed by destination `key` plus the ⌘K action ids
 * and a couple of chrome affordances (sign out).
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  insights: Activity,
  games: Library,
  analysis: ScanSearch,
  improve: TrendingUp,
  coach: Sparkles,
  profile: User,
  settings: Settings,
  weaknesses: Crosshair,
  progress: LineChart,
  import: Upload,
  // ⌘K actions
  'act-import': Upload,
  'act-focus': Target,
  // chrome
  signout: LogOut,
};

/**
 * Render the mapped Lucide icon for a nav key. Inherits `currentColor` so the
 * existing token-driven text colors (active/hover states) apply unchanged.
 */
export function NavIcon({
  navKey,
  size = 18,
  className,
}: {
  navKey: string;
  size?: number;
  className?: string;
}) {
  const Icon = NAV_ICONS[navKey] ?? Sparkles;
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden />;
}
