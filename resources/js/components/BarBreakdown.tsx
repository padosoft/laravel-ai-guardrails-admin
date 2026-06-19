/**
 * BarBreakdown — horizontal bar chart for PII-by-detector breakdown.
 * Pixel-faithful recreation of Charts.BarBreakdown from the prototype.
 *
 * Renders one bar row per item. When items is empty, renders an empty-state
 * message instead of a broken chart.
 */

interface BarItem {
  label: string;
  value: number;
}

interface BarBreakdownProps {
  items: BarItem[];
  color?: string;
  emptyMessage?: string;
}

export function BarBreakdown({
  items,
  color = 'var(--color-accent)',
  emptyMessage = 'No per-detector data yet.',
}: BarBreakdownProps) {
  if (items.length === 0) {
    return (
      <div className="bar-empty" data-testid="agr-bar-empty">
        {emptyMessage}
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div>
      {items.map((it) => (
        <div
          className="bar-row"
          key={it.label}
          data-testid={`agr-bar-${it.label}`}
        >
          <span className="bar-label">{it.label}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{
                width: `${(it.value / max) * 100}%`,
                background: color,
              }}
            />
          </span>
          <span className="bar-val tnum">{it.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
