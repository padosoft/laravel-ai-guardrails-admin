/* ============================================================
   Charts — inline SVG. window.Charts.*
   ============================================================ */
(function () {
  "use strict";

  function scale(val, min, max, lo, hi) {
    if (max === min) return (lo + hi) / 2;
    return lo + ((val - min) / (max - min)) * (hi - lo);
  }

  /* ---------- Sparkline ---------- */
  function Sparkline({ data, color = "var(--color-accent)", height = 34, fill = true }) {
    const w = 100;
    const h = height;
    const pad = 3;
    const max = Math.max(...data, 1);
    const min = 0;
    const n = data.length;
    const pts = data.map((d, i) => {
      const x = scale(i, 0, n - 1, pad, w - pad);
      const y = scale(d, min, max, h - pad, pad);
      return [x, y];
    });
    const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${(w - pad).toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`;
    const gid = "sg" + Math.random().toString(36).slice(2, 7);
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {fill && <path d={area} fill={`url(#${gid})`} />}
        <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  /* ---------- Stacked area: allowed (green) + observed (cyan) + blocked (red) ---------- */
  function StackedAreaChart({ points, height = 210 }) {
    const w = 760;
    const h = height;
    const padL = 8;
    const padR = 8;
    const padT = 14;
    const padB = 26;
    const n = points.length;
    const obs = (p) => p.observed || 0;
    const totals = points.map((p) => p.allowed + obs(p) + p.blocked);
    const max = Math.max(...totals, 1);
    const niceMax = Math.ceil(max / 50) * 50;

    const xAt = (i) => scale(i, 0, n - 1, padL, w - padR);
    const yAt = (v) => scale(v, 0, niceMax, h - padB, padT);

    const allowPts = points.map((p, i) => [xAt(i), yAt(p.allowed)]);
    const obsTopPts = points.map((p, i) => [xAt(i), yAt(p.allowed + obs(p))]);
    const totalPts = points.map((p, i) => [xAt(i), yAt(p.allowed + obs(p) + p.blocked)]);

    const toLine = (pts) => pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const bandBetween = (topPts, botPts) =>
      toLine(topPts) +
      " " +
      botPts
        .slice()
        .reverse()
        .map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1))
        .join(" ") +
      " Z";

    const allowArea = toLine(allowPts) + ` L${xAt(n - 1).toFixed(1)} ${h - padB} L${xAt(0).toFixed(1)} ${h - padB} Z`;
    const obsArea = bandBetween(obsTopPts, allowPts);
    const blockArea = bandBetween(totalPts, obsTopPts);

    const gridVals = [0, niceMax / 2, niceMax];

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Injection throughput, allowed versus observed versus blocked over 7 days">
        <defs>
          <linearGradient id="allowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-allow)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--color-allow)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridVals.map((g, i) => (
          <g key={i}>
            <line className="chart-grid-line" x1={padL} x2={w - padR} y1={yAt(g)} y2={yAt(g)} strokeDasharray={i === 0 ? "0" : "3 4"} opacity={i === 0 ? 1 : 0.6} />
            <text x={w - padR} y={yAt(g) - 4} textAnchor="end" fontSize="10" fill="var(--color-fg-subtle)">
              {g}
            </text>
          </g>
        ))}

        {/* allowed band */}
        <path d={allowArea} fill="url(#allowGrad)" />
        <path d={toLine(allowPts)} fill="none" stroke="var(--color-allow)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* observed band (monitor / shadow-mode) */}
        <path d={obsArea} fill="color-mix(in srgb, var(--color-observe) 32%, transparent)" />
        <path d={toLine(obsTopPts)} fill="none" stroke="var(--color-observe)" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* blocked band (on top, red — eye drawn to threats) */}
        <path d={blockArea} fill="color-mix(in srgb, var(--color-block) 40%, transparent)" />
        <path d={toLine(totalPts)} fill="none" stroke="var(--color-block)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* x labels */}
        {points.map((p, i) => (
          <text key={i} x={xAt(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--color-fg-subtle)">
            {p.at}
          </text>
        ))}

        {/* end dots */}
        <circle cx={xAt(n - 1)} cy={yAt(points[n - 1].allowed)} r="3" fill="var(--color-allow)" />
        <circle cx={xAt(n - 1)} cy={yAt(totals[n - 1])} r="3" fill="var(--color-block)" />
      </svg>
    );
  }

  /* ---------- Horizontal bar breakdown ---------- */
  function BarBreakdown({ items, color = "var(--color-accent)" }) {
    const max = Math.max(...items.map((i) => i.value), 1);
    return (
      <div>
        {items.map((it) => (
          <div className="bar-row" key={it.label}>
            <span className="bar-label">{it.label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: (it.value / max) * 100 + "%", background: it.color || color }} />
            </span>
            <span className="bar-val tnum">{it.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }

  window.Charts = { Sparkline, StackedAreaChart, BarBreakdown };
})();
