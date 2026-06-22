import React from 'react';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Skeleton block (System Design §6 / §12). Shimmer sweep that goes static under
 * prefers-reduced-motion (handled by the .iv-skeleton rule in globals.css).
 * Marked aria-hidden — the surrounding region should announce loading state.
 */
export function Skeleton({ width = '100%', height = 16, radius, className = '', style }: SkeletonProps) {
  return (
    <span
      className={`iv-skeleton ${className}`}
      aria-hidden
      style={{ display: 'block', width, height, ...(radius ? { borderRadius: radius } : null), ...style }}
    />
  );
}
