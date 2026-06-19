import { useId } from 'react';

/**
 * Sparkline — inline SVG trend line for control cards.
 * Pixel-faithful recreation of docs/prototype/app/charts.jsx Sparkline (~L13).
 */
export function Sparkline({
  data,
  color = 'var(--color-accent)',
  height = 34,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const w = 100;
  const h = height;
  const pad = 3;
  const max = Math.max(...data, 1);
  const min = 0;
  const n = data.length;

  function scale(val: number, fromMin: number, fromMax: number, toMin: number, toMax: number) {
    if (fromMax === fromMin) return (toMin + toMax) / 2;
    return toMin + ((val - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
  }

  const pts = data.map((d, i) => {
    const x = scale(i, 0, n - 1, pad, w - pad);
    const y = scale(d, min, max, h - pad, pad);
    return [x, y] as [number, number];
  });

  const line = pts
    .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' ');

  const area =
    line +
    ` L${(w - pad).toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`;

  // Unique gradient id per instance — React useId() guarantees no collisions
  // even when multiple Sparklines are rendered simultaneously (e.g. 4 control cards).
  const uid = useId();
  const gid = `sg${uid}`;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ width: '100%', height: h, display: 'block' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
