import type { ControlMode } from '../lib/api/types';

type BadgeVariant = 'enforce' | 'monitor' | 'off' | 'allow' | 'block' | 'observe' | 'warn' | 'neutral';

/** Maps a ControlMode to its display label */
export function modeBadgeLabel(mode: ControlMode): string {
  const map: Record<ControlMode, string> = {
    enforce: 'ENFORCE',
    monitor: 'MONITOR',
    off: 'OFF',
  };
  return map[mode] ?? mode.toUpperCase();
}

/** Maps a ControlMode to a badge variant for styling */
export function modeBadgeVariant(mode: ControlMode): BadgeVariant {
  const map: Record<ControlMode, BadgeVariant> = {
    enforce: 'enforce',
    monitor: 'monitor',
    off: 'off',
  };
  return map[mode] ?? 'neutral';
}

export function Badge({
  variant,
  children,
  testId,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <span
      className={`badge ${variant ? `badge-${variant}` : ''}`}
      data-testid={testId}
    >
      {children}
    </span>
  );
}
