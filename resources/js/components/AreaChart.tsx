import type { TrendPoint } from '../lib/api/types';

/**
 * AreaChart — stacked SVG area chart for the Dashboard throughput section.
 *
 * IMPORTANT — three DISJOINT bands (no double-counting):
 *   clean   = allowed − observed   (green, bottom)
 *   observed = observed             (cyan, middle)
 *   blocked  = blocked              (red,  top)
 *
 * The invariant from the core API is: total = blocked + allowed
 * and observed ⊆ allowed.  We never stack allowed+observed+blocked
 * because that would double-count the observed subset.
 *
 * Visual stacking order (bottom → top): clean, observed, blocked.
 */

interface AreaChartPoint {
  /** x-axis label (YYYY-MM-DD or short form) */
  at?: string;
  /** Full date from TrendPoint.date */
  date?: string;
  total: number;
  blocked: number;
  allowed: number;
  observed: number;
}

function scale(val: number, fromMin: number, fromMax: number, toMin: number, toMax: number) {
  if (fromMax === fromMin) return (toMin + toMax) / 2;
  return toMin + ((val - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
}

function toPathLine(pts: [number, number][]) {
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

function bandArea(topPts: [number, number][], botPts: [number, number][]) {
  return (
    toPathLine(topPts) +
    ' ' +
    [...botPts]
      .reverse()
      .map((p) => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
      .join(' ') +
    ' Z'
  );
}

export function AreaChart({
  points,
  height = 210,
}: {
  points: (TrendPoint | AreaChartPoint)[];
  height?: number;
}) {
  const w = 760;
  const h = height;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const n = points.length;

  // Compute clean = allowed − observed (clamped to 0)
  const cleanValues = points.map((p) => Math.max(0, p.allowed - (p.observed ?? 0)));
  const obsValues = points.map((p) => p.observed ?? 0);
  const blockedValues = points.map((p) => p.blocked);

  // For Y-scale we use the true total (blocked + allowed), since clean+obs+blocked = allowed+blocked = total
  const totals = points.map((p) => p.blocked + p.allowed);
  const maxVal = Math.max(...totals, 1);
  const niceMax = Math.ceil(maxVal / 50) * 50;

  // Sum of clean values for test assertion
  const cleanSum = cleanValues.reduce((a, b) => a + b, 0);

  const xAt = (i: number) => scale(i, 0, n - 1, padL, w - padR);
  const yAt = (v: number) => scale(v, 0, niceMax, h - padB, padT);

  // Stacked bottom → top: clean (bottom), observed (on top of clean), blocked (on top of clean+obs)
  const cleanTopPts = points.map((_, i) => [xAt(i), yAt(cleanValues[i])] as [number, number]);
  const obsTopPts = points.map((_, i) => [xAt(i), yAt(cleanValues[i] + obsValues[i])] as [number, number]);
  const blockTopPts = points.map((_, i) => [xAt(i), yAt(cleanValues[i] + obsValues[i] + blockedValues[i])] as [number, number]);
  const baseLine = points.map((_, i) => [xAt(i), yAt(0)] as [number, number]);

  const cleanAreaPath = bandArea(cleanTopPts, baseLine);
  const obsAreaPath = bandArea(obsTopPts, cleanTopPts);
  const blockAreaPath = bandArea(blockTopPts, obsTopPts);

  const gridVals = [0, niceMax / 2, niceMax];

  const xLabel = (p: TrendPoint | AreaChartPoint) => {
    // Use .at if present (prototype), otherwise shorten date
    if ('at' in p && p.at) return p.at;
    if ('date' in p && p.date) return p.date.slice(5); // MM-DD
    return '';
  };

  return (
    <svg
      data-testid="agr-area-chart"
      data-clean-sum={cleanSum}
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Injection throughput — clean, observed, and blocked over time"
    >
      {/* Grid lines */}
      {gridVals.map((g, i) => (
        <g key={i}>
          <line
            className="chart-grid-line"
            x1={padL}
            x2={w - padR}
            y1={yAt(g)}
            y2={yAt(g)}
            strokeDasharray={i === 0 ? '0' : '3 4'}
            opacity={i === 0 ? 1 : 0.6}
          />
          <text x={w - padR} y={yAt(g) - 4} textAnchor="end" fontSize="10" fill="var(--color-fg-subtle)">
            {g}
          </text>
        </g>
      ))}

      {/* clean band (allowed − observed) — green, bottom */}
      <path data-testid="agr-chart-series" data-series="clean" d={cleanAreaPath} fill="color-mix(in srgb, var(--color-allow) 30%, transparent)" />
      <path d={toPathLine(cleanTopPts)} fill="none" stroke="var(--color-allow)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

      {/* observed band — cyan, middle */}
      <path data-testid="agr-chart-series" data-series="observed" d={obsAreaPath} fill="color-mix(in srgb, var(--color-observe) 32%, transparent)" />
      <path d={toPathLine(obsTopPts)} fill="none" stroke="var(--color-observe)" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

      {/* blocked band — red, top */}
      <path data-testid="agr-chart-series" data-series="blocked" d={blockAreaPath} fill="color-mix(in srgb, var(--color-block) 40%, transparent)" />
      <path d={toPathLine(blockTopPts)} fill="none" stroke="var(--color-block)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

      {/* X labels */}
      {points.map((p, i) => (
        <text key={i} x={xAt(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--color-fg-subtle)">
          {xLabel(p)}
        </text>
      ))}

      {/* End dots */}
      {n > 0 && (
        <>
          <circle cx={xAt(n - 1)} cy={yAt(cleanValues[n - 1])} r="3" fill="var(--color-allow)" />
          <circle cx={xAt(n - 1)} cy={yAt(cleanValues[n - 1] + obsValues[n - 1] + blockedValues[n - 1])} r="3" fill="var(--color-block)" />
        </>
      )}
    </svg>
  );
}
