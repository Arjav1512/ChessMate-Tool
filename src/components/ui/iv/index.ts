/**
 * Ivory UI primitives (System Design §6) — the new design-system component
 * library built during the strangler migration. Import the stylesheet once at
 * app entry (or it is pulled in transitively via this barrel's consumers).
 *
 * At cutover (Phase 11) these are promoted to the canonical `components/ui` and
 * the legacy Obsidian primitives are removed.
 */
import './iv.css';

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { Spinner } from './Spinner';
export { Input, Textarea, SearchInput } from './Input';
export type { InputProps, TextareaProps, SearchInputProps } from './Input';
export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';
export { MetricCard } from './MetricCard';
export type { MetricCardProps } from './MetricCard';
export { Badge } from './Badge';
export type { BadgeProps, BadgeImpact } from './Badge';
export { Chip, MoveQualityChip } from './Chip';
export type { ChipProps, MoveQualityChipProps, MoveQuality } from './Chip';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';
export { Tabs, TabPanel } from './Tabs';
export type { TabsProps, TabItem, TabPanelProps } from './Tabs';
export { Dropdown } from './Dropdown';
export type { DropdownProps, DropdownItem } from './Dropdown';
export { Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';
export { Dialog } from './Dialog';
export type { DialogProps } from './Dialog';
export { IvToastProvider, useIvToast } from './Toast';
export type { ToastVariant, ToastMessage } from './Toast';
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';
export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';
export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
