import type { LucideIcon } from 'lucide-react';

/**
 * StatCard — a single KPI card for the Dashboard totals row.
 * Pixel-faithful recreation of the prototype's StatCard primitive.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  delta,
  deltaDir,
  testId,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  sub?: string;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  testId?: string;
}) {
  return (
    <div className="stat-card" data-testid={testId}>
      <div className="stat-card-head">
        {Icon ? <Icon size={15} className="stat-card-icon" /> : null}
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      {sub ? <div className="stat-card-sub">{sub}</div> : null}
      {delta ? (
        <div className={`stat-card-delta ${deltaDir ?? ''}`}>{delta}</div>
      ) : null}
    </div>
  );
}
