/* ============================================================
   UI primitives — window.UI.*
   ============================================================ */
(function () {
  "use strict";
  const { useState, useEffect, useRef, useCallback } = React;
  const Icon = window.Icon;

  /* ---------- Panel ---------- */
  function Panel({ children, pad, className = "", style }) {
    return (
      <div className={"panel " + (pad ? "panel-pad " : "") + className} style={style}>
        {children}
      </div>
    );
  }

  /* ---------- Verdict badge ---------- */
  const VERDICT = {
    allow: { cls: "badge-allow", label: "ALLOWED", icon: null },
    allowed: { cls: "badge-allow", label: "ALLOWED", icon: null },
    block: { cls: "badge-block", label: "BLOCKED", icon: null },
    blocked: { cls: "badge-block", label: "BLOCKED", icon: null },
    observed: { cls: "badge-observe", label: "OBSERVED", icon: "eye" },
    too_long: { cls: "badge-warn", label: "TOO LONG", icon: null },
    warn: { cls: "badge-warn", label: "DEGRADED", icon: null },
    pending: { cls: "badge-pending", label: "PENDING", icon: null },
  };
  function VerdictBadge({ kind, label, dot = true }) {
    const v = VERDICT[kind] || { cls: "badge-neutral", label: label || kind };
    return (
      <span className={"badge " + v.cls}>
        {v.icon ? <Icon name={v.icon} size={11} /> : dot && <span className="bdot" />}
        {label || v.label}
      </span>
    );
  }

  /* ---------- Mode segmented control (Enforce / Monitor / Off) ---------- */
  const MODES = [
    { id: "enforce", label: "Enforce" },
    { id: "monitor", label: "Monitor" },
    { id: "off", label: "Off" },
  ];
  function ModeSegmented({ mode, onChange, disabled }) {
    return (
      <div className="mode-seg" role="group" aria-label="Control mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            data-mode={m.id}
            className={mode === m.id ? "on" : ""}
            onClick={() => !disabled && onChange && onChange(m.id)}
            disabled={disabled}
            aria-pressed={mode === m.id}
          >
            {m.id === "monitor" && <Icon name="eye" size={12} />}
            {m.label}
          </button>
        ))}
      </div>
    );
  }

  /* ---------- Status dot ---------- */
  function StatusDot({ status = "engaged", live = false }) {
    return <span className={"status-dot " + status + (live ? " live" : "")} role="img" aria-label={status} />;
  }

  /* ---------- Toggle ---------- */
  function Toggle({ on, onChange, disabled, name, hint }) {
    const sw = (
      <button
        type="button"
        className={"toggle" + (on ? " on" : "")}
        onClick={() => !disabled && onChange && onChange(!on)}
        disabled={disabled}
        role="switch"
        aria-checked={on}
        aria-label={name || "toggle"}
      />
    );
    if (!name && !hint) return sw;
    return (
      <div className="toggle-row">
        {sw}
        <div className="toggle-label">
          <div className="tl-name">{name}</div>
          {hint && <div className="tl-hint">{hint}</div>}
        </div>
      </div>
    );
  }

  /* ---------- StatCard ---------- */
  function StatCard({ label, icon, value, delta, deltaDir = "flat", sub, valueClass = "" }) {
    return (
      <Panel className="stat-card">
        <div className="stat-label">
          {icon && <Icon name={icon} size={12} />}
          {label}
        </div>
        <div className={"stat-value " + valueClass}>{value}</div>
        {delta && <div className={"stat-delta " + deltaDir}>{delta}</div>}
        {sub && <div className="stat-delta flat">{sub}</div>}
      </Panel>
    );
  }

  /* ---------- DataTable ---------- */
  function DataTable({ columns, rows, onRowClick, rowKey = "id", empty }) {
    if (!rows || rows.length === 0) {
      return empty || <EmptyState title="No rows" msg="Nothing to display." />;
    }
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={c.width ? { width: c.width } : undefined} className={c.align === "right" ? "right" : ""}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r[rowKey]}
                className={onRowClick ? "clickable" : ""}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter") onRowClick(r);
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? "right" : ""}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ---------- Code block ---------- */
  function CodeBlock({ children, className = "" }) {
    return <div className={"code-block " + className}>{children}</div>;
  }

  /* ---------- Prompt excerpt with matched span ---------- */
  function PromptExcerpt({ text, match }) {
    let body;
    if (match && Array.isArray(match)) {
      const [s, e] = match;
      body = (
        <>
          {text.slice(0, s)}
          <mark>{text.slice(s, e)}</mark>
          {text.slice(e)}
        </>
      );
    } else {
      body = text;
    }
    return <div className="code-block prompt-excerpt">{body}</div>;
  }

  /* ---------- Privacy panel: prompt stored hashed / redacted ---------- */
  function PromptPrivacy({ storage, hash, length }) {
    const labelMap = {
      hash: "hashed",
      redact: "redacted",
      truncate: "truncated",
    };
    const word = labelMap[storage] || storage;
    return (
      <div className="privacy-panel">
        <span className="pp-icon">
          <Icon name={storage === "hash" ? "hash" : "eyeOff"} size={16} />
        </span>
        <div className="grow">
          <div className="pp-title">Prompt stored as {word} for privacy</div>
          <div className="pp-hint">
            The full text is unavailable by policy ({storage === "hash" ? "hash-only retention" : storage === "truncate" ? "length-capped" : "PII-redacted at rest"}). The match position is suppressed.
          </div>
          {(hash || length != null) && (
            <div className="pp-hash">
              {hash && <span>{hash}</span>}
              {length != null && <span>length: {length.toLocaleString()} chars</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Key/value list ---------- */
  function KV({ items }) {
    return (
      <dl className="kv">
        {items.map(([k, v], i) => (
          <React.Fragment key={i}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }

  /* ---------- Chips (tag editor) ---------- */
  function Chips({ values, onRemove, onAdd, addLabel = "Add key" }) {
    return (
      <div className="chips">
        {values.map((v) => (
          <span className="chip mono" key={v}>
            {v}
            {onRemove && (
              <button type="button" onClick={() => onRemove(v)} aria-label={"Remove " + v}>
                <Icon name="x" size={12} />
              </button>
            )}
          </span>
        ))}
        {onAdd && (
          <button type="button" className="chip-add" onClick={onAdd}>
            <Icon name="plus" size={12} /> {addLabel}
          </button>
        )}
      </div>
    );
  }

  /* ---------- States ---------- */
  function LoadingRows({ rows = 5, cols = 4 }) {
    return (
      <div style={{ padding: "6px 0" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-14" style={{ padding: "11px 14px", borderBottom: "1px solid var(--color-border)" }}>
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className="skeleton" style={{ height: 13, flex: j === cols - 1 ? "0 0 70px" : 1 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  function SkeletonCard({ h = 96 }) {
    return (
      <Panel className="stat-card">
        <div className="skeleton" style={{ height: 11, width: "55%" }} />
        <div className="skeleton" style={{ height: 26, width: "40%", marginTop: 12 }} />
        <div className="skeleton" style={{ height: 11, width: "70%", marginTop: 12 }} />
      </Panel>
    );
  }

  function EmptyState({ title, msg, icon = "inbox", positive = false, action }) {
    return (
      <div className="state-box">
        <div className="state-icon" style={positive ? { color: "var(--color-allow)", borderColor: "color-mix(in srgb, var(--color-allow) 40%, transparent)" } : undefined}>
          <Icon name={positive ? "check" : icon} size={22} />
        </div>
        <div className="state-title">{title}</div>
        {msg && <div className="state-msg">{msg}</div>}
        {action}
      </div>
    );
  }

  function ErrorState({ kind = "error", onRetry }) {
    const map = {
      unavailable: { title: "The guardrails core is unreachable", msg: "We couldn't reach the AI Guardrails service. Check that the core package is installed and the API is enabled." },
      invalid: { title: "Schema version mismatch", msg: "The core returned a payload this admin build doesn't understand. Update the admin or the core to compatible versions." },
      error: { title: "Something went wrong", msg: "An unexpected error occurred while loading this data." },
    };
    const m = map[kind] || map.error;
    return (
      <div className="state-box error">
        <div className="state-icon">
          <Icon name="alert" size={22} />
        </div>
        <div className="state-title">{m.title}</div>
        <div className="state-msg">{m.msg}</div>
        {onRetry && (
          <button className="btn btn-sm mt-8" onClick={onRetry}>
            <Icon name="refresh" size={13} /> Retry
          </button>
        )}
      </div>
    );
  }

  function Banner({ kind = "warn", icon, children }) {
    return (
      <div className={"banner " + (kind === "info" ? "info" : "")}>
        <span className="bn-icon">
          <Icon name={icon || (kind === "info" ? "info" : "alert")} size={17} />
        </span>
        <span className="bn-text">{children}</span>
      </div>
    );
  }

  /* ---------- Drawer (focus-trapped, ESC) ---------- */
  function Drawer({ title, sub, badge, onClose, children, footer }) {
    const ref = useRef(null);
    useEffect(() => {
      const onKey = (e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab" && ref.current) {
          const f = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (f.length) {
            const first = f[0];
            const last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      document.addEventListener("keydown", onKey);
      const t = setTimeout(() => {
        if (ref.current) {
          const f = ref.current.querySelector("button, [href], input, select, textarea");
          if (f) f.focus();
        }
      }, 60);
      return () => {
        document.removeEventListener("keydown", onKey);
        clearTimeout(t);
      };
    }, [onClose]);

    return (
      <>
        <div className="scrim" onClick={onClose} />
        <div className="drawer" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
          <div className="drawer-head">
            <div className="grow">
              <div className="flex items-center gap-10">
                <span className="dh-title">{title}</span>
                {badge}
              </div>
              {sub && <div className="dh-sub">{sub}</div>}
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="drawer-body">{children}</div>
          {footer && <div className="drawer-foot">{footer}</div>}
        </div>
      </>
    );
  }

  /* ---------- Search input ---------- */
  function SearchInput({ value, onChange, placeholder = "Search…" }) {
    return (
      <div className="input-search">
        <Icon name="search" size={14} />
        <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  /* ---------- Section header inside page ---------- */
  function SectionLabel({ children, right }) {
    return (
      <div className="flex items-center justify-between" style={{ margin: "22px 0 11px" }}>
        <span className="section-label">{children}</span>
        {right}
      </div>
    );
  }

  /* ---------- Toasts ---------- */
  function ToastHost({ toasts }) {
    return (
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + (t.kind || "ok")}>
            <span className="tk-icon">
              <Icon name={t.kind === "block" ? "x" : "check"} size={16} />
            </span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    );
  }
  function useToasts() {
    const [toasts, setToasts] = useState([]);
    const push = useCallback((msg, kind = "ok") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, msg, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    }, []);
    return { toasts, push };
  }

  window.UI = {
    Panel,
    VerdictBadge,
    ModeSegmented,
    StatusDot,
    Toggle,
    StatCard,
    DataTable,
    CodeBlock,
    PromptExcerpt,
    PromptPrivacy,
    KV,
    Chips,
    LoadingRows,
    SkeletonCard,
    EmptyState,
    ErrorState,
    Banner,
    Drawer,
    SearchInput,
    SectionLabel,
    ToastHost,
    useToasts,
  };
})();
