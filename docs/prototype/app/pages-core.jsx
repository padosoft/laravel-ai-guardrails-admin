/* ============================================================
   Core pages — Dashboard, Injection Audit, Tool Firewall, Output Handler
   window.Pages.Dashboard / InjectionAudit / ToolFirewall / OutputHandler
   ============================================================ */
(function () {
  "use strict";
  const { useState, useMemo } = React;
  const UI = window.UI;
  const Charts = window.Charts;
  const Icon = window.Icon;
  const M = window.MOCK;
  const { Panel, StatCard, DataTable, VerdictBadge, ModeSegmented, StatusDot, Toggle, Drawer, PromptExcerpt, PromptPrivacy, CodeBlock, KV, Chips, SearchInput, SectionLabel, EmptyState, ErrorState, Banner, LoadingRows, SkeletonCard } = UI;

  /* Shared region switch for demo states */
  function Region({ demo, children, loading, empty, errorKind = "unavailable", onRetry }) {
    if (demo === "loading") return loading;
    if (demo === "error") return <ErrorState kind={errorKind} onRetry={onRetry} />;
    if (demo === "empty") return empty;
    return children;
  }

  function PageHead({ icon, title, subtitle, actions }) {
    return (
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            {icon && <Icon name={icon} size={19} />}
            {title}
          </h1>
          <p className="screen-subtitle">{subtitle}</p>
        </div>
        {actions && <div className="page-head-actions">{actions}</div>}
      </div>
    );
  }

  function LivePill() {
    return (
      <span className="live-pill">
        <span className="live-dot" />
        Live
      </span>
    );
  }

  /* ============================================================
     1. Dashboard — Guardrail Health
     ============================================================ */
  function Dashboard({ navigate, demo }) {
    const [range, setRange] = useState("7d");
    const C = M.controls;
    const T = M.totals;

    const statusText = { engaged: "ENFORCE", monitor: "MONITOR", degraded: "FALLBACK", disabled: "OFF" };
    const modeText = { enforce: "ENFORCE", monitor: "MONITOR", off: "OFF" };

    return (
      <div className="page" data-screen-label="Dashboard">
        <PageHead
          icon="shield"
          title="Guardrail Health"
          subtitle="Posture of the four guardrail controls protecting your AI agents. Live status, recent activity, and 24h threat throughput."
          actions={
            <>
              <select className="select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Time range">
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <LivePill />
            </>
          }
        />

        <Region
          demo={demo}
          loading={
            <div className="controls-grid">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          }
          empty={<Panel><EmptyState title="No activity yet" msg="The dashboard fills as your agents start running through the guardrails." /></Panel>}
        >
          {/* Four control cards — defensible perimeter */}
          <div className="controls-grid">
            {C.map((c) => (
              <button key={c.id} className={"panel control-card s-" + c.status} onClick={() => navigate(c.route)}>
                <div className="cc-top">
                  <div>
                    <div className="flex items-center gap-8">
                      <span className="cc-letter">CONTROL {c.letter}</span>
                    </div>
                    <div className="cc-name">{c.name}</div>
                  </div>
                  <div className="cc-icon">
                    <Icon name={c.icon} size={17} />
                  </div>
                </div>
                <div className={"cc-status " + c.status}>
                  <StatusDot status={c.status} live={c.status === "engaged" || c.status === "monitor"} />
                  {c.status === "degraded" ? statusText.degraded : modeText[c.mode] || statusText[c.status]}
                </div>
                <div className="cc-posture">{c.posture}</div>
                <div className="cc-spark">
                  <Charts.Sparkline data={c.spark} color={c.status === "degraded" ? "var(--color-warn)" : c.status === "monitor" ? "var(--color-observe)" : c.id === "input_screen" ? "var(--color-block)" : "var(--color-accent)"} />
                </div>
              </button>
            ))}
          </div>

          {/* Throughput */}
          <SectionLabel
            right={
              <div className="legend">
                <span className="lg"><span className="sw" style={{ background: "var(--color-allow)" }} /> Allowed</span>
                <span className="lg"><span className="sw" style={{ background: "var(--color-observe)" }} /> Observed</span>
                <span className="lg"><span className="sw" style={{ background: "var(--color-block)" }} /> Blocked</span>
              </div>
            }
          >
            Injection throughput · 7 days
          </SectionLabel>
          <Panel pad>
            <Charts.StackedAreaChart points={M.trend} />
          </Panel>

          {/* Totals */}
          <SectionLabel>Totals · last 24h</SectionLabel>
          <div className="grid cols-4 gap-14">
            <StatCard label="Prompts screened" icon="scan" value={T.attempts_24h.toLocaleString()} sub="across all agents" />
            <StatCard label="Observed" icon="eye" value={T.observed_24h} sub="monitor-mode would-block" />
            <StatCard label="Blocked" icon="shield" value={T.blocked_24h} delta="injection attempts refused" deltaDir="up" />
            <StatCard label="Pending approvals" icon="gavel" value={T.pending_approvals} delta="awaiting human review" deltaDir="flat" />
          </div>
        </Region>
      </div>
    );
  }

  /* ============================================================
     2. Injection Audit Log (Control B)
     ============================================================ */
  function InjectionAudit({ demo }) {
    const [q, setQ] = useState("");
    const [verdict, setVerdict] = useState("all");
    const [rule, setRule] = useState("any");
    const [principal, setPrincipal] = useState("");
    const [limit, setLimit] = useState(7);
    const [sel, setSel] = useState(null);

    const filtered = useMemo(() => {
      return M.audit.filter((r) => {
        if (verdict !== "all" && r.verdict !== verdict) return false;
        if (rule !== "any" && r.rule_id !== rule) return false;
        if (principal && String(r.principal_id) !== principal.trim()) return false;
        if (q && !(r.prompt || "").toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
    }, [q, verdict, rule, principal]);

    const shown = filtered.slice(0, limit);

    const isRaw = (r) => r.prompt_storage === "raw" || r.prompt_storage == null;

    const columns = [
      {
        key: "verdict",
        header: "Verdict",
        width: 116,
        render: (r) => <VerdictBadge kind={r.verdict} />,
      },
      {
        key: "rule_id",
        header: "Rule",
        width: 170,
        render: (r) => (r.rule_id ? <span className="cell-mono">{r.rule_id}</span> : <span className="subtle">—</span>),
      },
      {
        key: "principal_id",
        header: "Principal",
        width: 84,
        render: (r) => <span className="cell-mono">{r.principal_id}</span>,
      },
      {
        key: "prompt",
        header: "Prompt (excerpt)",
        render: (r) =>
          isRaw(r) ? (
            <div className="cell-prompt">{r.prompt}</div>
          ) : (
            <span className="flex items-center gap-6 subtle" style={{ fontSize: 12 }}>
              <Icon name={r.prompt_storage === "hash" ? "hash" : "eyeOff"} size={13} />
              {r.prompt_storage === "hash" ? "stored hashed" : r.prompt_storage === "truncate" ? "truncated · " + (r.prompt_length || 0).toLocaleString() + " chars" : "redacted"}
            </span>
          ),
      },
      {
        key: "when",
        header: "When",
        width: 90,
        render: (r) => <span className="cell-when">{r.ago}</span>,
      },
      { key: "arrow", header: "", width: 28, render: () => <span className="row-arrow"><Icon name="chevronRight" size={15} /></span> },
    ];

    return (
      <div className="page" data-screen-label="Injection Audit Log">
        <PageHead
          icon="list"
          title="Injection Audit Log"
          subtitle="Every prompt screened by the input guardrails — blocked and allowed. Append-only forensic trail; the audit is the product."
          actions={<LivePill />}
        />

        <Region
          demo={demo}
          loading={
            <Panel>
              <div className="filter-bar">
                <div className="skeleton" style={{ height: 32, width: 230, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 32, width: 120, borderRadius: 8 }} />
              </div>
              <LoadingRows rows={6} cols={5} />
            </Panel>
          }
          empty={
            <Panel>
              <EmptyState title="No injection attempts recorded yet" msg="The audit log fills as agents run. Every screened prompt — blocked or allowed — is recorded here, append-only." />
            </Panel>
          }
        >
          <Panel>
            <div className="filter-bar">
              <SearchInput value={q} onChange={setQ} placeholder="Search prompt text…" />
              <select className="select" value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Verdict filter">
                <option value="all">Verdict: all</option>
                <option value="blocked">Blocked</option>
                <option value="observed">Observed</option>
                <option value="allowed">Allowed</option>
                <option value="too_long">Too long</option>
              </select>
              <select className="select" value={rule} onChange={(e) => setRule(e.target.value)} aria-label="Rule filter">
                <option value="any">Rule: any</option>
                {Object.keys(M.ruleLabels).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input className="input mono" style={{ width: 110 }} value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="principal" aria-label="Principal id" />
              <div className="grow" />
              <span className="subtle" style={{ fontSize: 12.5 }}>
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </span>
            </div>

            {shown.length === 0 ? (
              <EmptyState title="No matching attempts" msg="No audit rows match the current filters. Try widening the verdict or clearing the search." />
            ) : (
              <DataTable columns={columns} rows={shown} onRowClick={setSel} />
            )}

            {filtered.length > shown.length && (
              <div style={{ padding: 14, textAlign: "center", borderTop: "1px solid var(--color-border)" }}>
                <button className="btn btn-sm" onClick={() => setLimit((l) => l + 7)}>
                  Load more · {filtered.length - shown.length} remaining
                </button>
              </div>
            )}
          </Panel>
        </Region>

        {sel && (
          <Drawer
            title={"Attempt #" + sel.id}
            sub={sel.occurred_at + " UTC"}
            badge={<VerdictBadge kind={sel.verdict} />}
            onClose={() => setSel(null)}
          >
            <KV
              items={[
                ["Verdict", sel.verdict],
                ["Mode", sel.mode],
                ["Rule", sel.rule_id || "—"],
                ["Ruleset", sel.ruleset_version],
                ["Principal", sel.principal_id],
                ["Storage", sel.prompt_storage],
                ["Recorded", sel.occurred_at + " UTC"],
              ]}
            />
            <div className="section-label" style={{ margin: "20px 0 8px" }}>
              Prompt {isRaw(sel) && sel.matched ? "· matched span highlighted" : ""}
            </div>
            {isRaw(sel) ? (
              <PromptExcerpt text={sel.prompt} match={sel.matched} />
            ) : (
              <PromptPrivacy storage={sel.prompt_storage} hash={sel.prompt_hash} length={sel.prompt_length} />
            )}
            {sel.verdict === "blocked" ? (
              <Banner kind="warn" icon="lock">
                The model was <b>never called</b>. The prompt matched rule <span className="mono">{sel.rule_id}</span> and was refused deterministically.
              </Banner>
            ) : sel.verdict === "observed" ? (
              <Banner kind="info" icon="eye">
                <b>Monitor mode</b> — this would have been blocked by rule <span className="mono">{sel.rule_id}</span>, but the control is in shadow mode, so the prompt was allowed through and only recorded.
              </Banner>
            ) : sel.verdict === "too_long" ? (
              <Banner kind="warn" icon="alert">
                Prompt exceeded the screening length cap ({(sel.prompt_length || 0).toLocaleString()} chars) and was refused before pattern matching.
              </Banner>
            ) : (
              <Banner kind="info" icon="check">
                Allowed through to the model. Recorded for the forensic trail — no rule matched.
              </Banner>
            )}
          </Drawer>
        )}
      </div>
    );
  }

  /* ============================================================
     3. Tool Firewall (Control A)
     ============================================================ */
  function ToolFirewall({ demo, push }) {
    const fw = M.firewall;
    const [enabled, setEnabled] = useState(fw.enabled);
    const [rejectUnknown, setRejectUnknown] = useState(fw.reject_unknown_arguments);
    const [keys, setKeys] = useState(fw.owner_keys);
    const [dirty, setDirty] = useState(false);
    const [sel, setSel] = useState(null);

    const mark = () => setDirty(true);
    const removeKey = (k) => { setKeys((ks) => ks.filter((x) => x !== k)); mark(); };
    const addKey = () => {
      const k = window.prompt("New owner key (overwritten server-side):");
      if (k && k.trim()) { setKeys((ks) => [...new Set([...ks, k.trim()])]); mark(); }
    };
    const save = () => { setDirty(false); push("Firewall settings saved · applies to new tool calls", "ok"); };

    const columns = [
      { key: "tool", header: "Tool", width: 140, render: (r) => <span className="cell-mono">{r.tool}</span> },
      {
        key: "reason_kind",
        header: "Reason",
        width: 124,
        render: (r) => (
          <span className={"badge " + (r.reason_kind === "authorization" ? "badge-pending" : "badge-warn")}>
            <span className="bdot" />
            {r.reason_kind}
          </span>
        ),
      },
      {
        key: "violations",
        header: "Violations",
        render: (r) => (
          <span className="cell-muted" style={{ fontSize: 12.5 }}>
            {Object.entries(r.violations)[0][1]}
          </span>
        ),
      },
      { key: "principal_id", header: "Principal", width: 84, render: (r) => <span className="cell-mono">{r.principal_id}</span> },
      { key: "when", header: "When", width: 86, render: (r) => <span className="cell-when">{r.ago}</span> },
      { key: "arrow", header: "", width: 28, render: () => <span className="row-arrow"><Icon name="chevronRight" size={15} /></span> },
    ];

    return (
      <div className="page" data-screen-label="Tool Firewall">
        <PageHead
          icon="shield"
          title="Tool Firewall"
          subtitle="Re-scopes model-chosen tool arguments to the authenticated user and validates them against each tool's schema. Closes confused-deputy / IDOR vectors server-side."
          actions={
            <span className={"badge " + (enabled ? "badge-allow" : "badge-neutral")}>
              <span className="bdot" />
              {enabled ? "ENGAGED" : "DISABLED"}
            </span>
          }
        />

        {!enabled && (
          <div style={{ marginBottom: 16 }}>
            <Banner kind="warn">
              <b>This control is disabled.</b> Tool arguments pass through unscoped. The rejection log below still reflects historical activity.
            </Banner>
          </div>
        )}

        <Region
          demo={demo}
          loading={<Panel><LoadingRows rows={5} cols={4} /></Panel>}
          empty={<Panel><EmptyState title="Firewall idle" msg="No tool calls have passed through the firewall yet." /></Panel>}
        >
          <SectionLabel>Posture</SectionLabel>
          <Panel pad>
            <div className="flex col gap-20">
              <div className="flex items-center justify-between gap-16 wrap">
                <div className="toggle-label">
                  <div className="tl-name">Firewall enabled</div>
                  <div className="tl-hint">Master switch for argument re-scoping + schema validation.</div>
                </div>
                <Toggle on={enabled} onChange={(v) => { setEnabled(v); mark(); }} />
              </div>
              <div style={{ borderTop: "1px solid var(--color-border)" }} />
              <div>
                <div className="toggle-label mb-14">
                  <div className="tl-name">Owner keys</div>
                  <div className="tl-hint">Argument keys the model may never choose — overwritten with the authenticated principal id.</div>
                </div>
                <Chips values={keys} onRemove={removeKey} onAdd={addKey} addLabel="Add owner key" />
              </div>
              <div style={{ borderTop: "1px solid var(--color-border)" }} />
              <div className="flex items-center justify-between gap-16 wrap">
                <div className="toggle-label">
                  <div className="tl-name">Reject unknown arguments</div>
                  <div className="tl-hint">Refuse any argument not declared in the tool's JSON schema (untrusted-input posture).</div>
                </div>
                <Toggle on={rejectUnknown} onChange={(v) => { setRejectUnknown(v); mark(); }} />
              </div>
            </div>
          </Panel>

          <SectionLabel>Tool authorization</SectionLabel>
          <Panel pad>
            <div className="flex items-center justify-between gap-16 wrap">
              <div className="toggle-label">
                <div className="tl-name flex items-center gap-8">
                  Authorization layer
                  <span className={"badge " + (fw.tool_authorization.enabled ? "badge-allow" : "badge-neutral")}><span className="bdot" />{fw.tool_authorization.enabled ? "ON" : "OFF"}</span>
                </div>
                <div className="tl-hint">Read-only here — edited on Settings · Tool authorization.</div>
              </div>
              <dl className="kv" style={{ gridTemplateColumns: "auto auto", gap: "6px 14px" }}>
                <dt>owner_key_depth</dt><dd>{fw.tool_authorization.owner_key_depth}</dd>
                <dt>destructive_match</dt><dd>{fw.tool_authorization.destructive_match}</dd>
              </dl>
            </div>
          </Panel>

          <SectionLabel>Rejections · last 24h: {fw.rejections.length === 0 ? 0 : fw.rejections.length}</SectionLabel>
          <Panel>
            {fw.rejections.length === 0 ? (
              <EmptyState positive title="No tool-argument rejections — good." msg="Every tool call passed schema validation and was correctly scoped to its principal." />
            ) : (
              <DataTable columns={columns} rows={fw.rejections} onRowClick={setSel} />
            )}
          </Panel>
        </Region>

        {dirty && (
          <div className="sticky-save">
            <Icon name="info" size={16} />
            <span className="grow" style={{ fontSize: 13 }}>You have unsaved firewall changes.</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { setEnabled(fw.enabled); setRejectUnknown(fw.reject_unknown_arguments); setKeys(fw.owner_keys); setDirty(false); }}>Discard</button>
            <button className="btn btn-sm btn-primary" onClick={save}><Icon name="check" size={14} /> Save changes</button>
          </div>
        )}

        {sel && (
          <Drawer title={"Rejection · " + sel.tool} sub={sel.occurred_at + " UTC · principal " + sel.principal_id} badge={<span className={"badge " + (sel.reason_kind === "authorization" ? "badge-pending" : "badge-warn")}><span className="bdot" />{sel.reason_kind}</span>} onClose={() => setSel(null)}>
            <div className="section-label" style={{ margin: "0 0 8px" }}>Violations</div>
            <CodeBlock>
              {Object.entries(sel.violations).map(([k, v], i) => (
                <div key={i}>
                  <span style={{ color: "var(--color-block)" }}>{k}</span>: {v}
                </div>
              ))}
            </CodeBlock>
            <Banner kind="info" icon="shield">
              The firewall handled this server-side before the tool executed. The model's value was overwritten or the call refused.
            </Banner>
          </Drawer>
        )}
      </div>
    );
  }

  /* ============================================================
     4. Output Handler (Control C)
     ============================================================ */
  function OutputHandler({ demo, push }) {
    const o = M.output;
    const [sanitizeHtml, setSanitizeHtml] = useState(o.sanitize_html);
    const [htmlMode, setHtmlMode] = useState(o.html_mode);
    const [neutralizeMd, setNeutralizeMd] = useState(o.neutralize_markdown);
    const [redactPii, setRedactPii] = useState(o.redact_pii);
    const [dirty, setDirty] = useState(false);
    const mark = () => setDirty(true);
    const save = () => { setDirty(false); push("Output handler settings saved", "ok"); };
    const isMonitor = o.mode === "monitor";

    const detectorBars = Object.entries(o.pii.by_detector).map(([label, value]) => ({ label, value, color: "var(--color-accent)" }));

    return (
      <div className="page" data-screen-label="Output Handler">
        <PageHead
          icon="filter"
          title="Output Handler"
          subtitle="Treats model output as untrusted: escapes HTML, neutralizes markdown exfiltration vectors, validates structured output, and redacts PII."
          actions={
            <span className={"badge " + (isMonitor ? "badge-observe" : "badge-allow")}>
              {isMonitor ? <Icon name="eye" size={11} /> : <span className="bdot" />}
              {isMonitor ? "MONITOR" : "ENFORCE"}
            </span>
          }
        />

        {isMonitor && (
          <div style={{ marginBottom: 16 }}>
            <Banner kind="info" icon="eye">
              <b>Shadow mode.</b> The handler computes what it <i>would</i> sanitize and redact, and records the counts below — but passes output through unmodified. Switch to Enforce on Settings to apply.
            </Banner>
          </div>
        )}

        <Region
          demo={demo}
          loading={<div className="grid cols-4 gap-14">{[0,1,2,3].map((i) => <SkeletonCard key={i} />)}</div>}
          empty={<Panel><EmptyState title="No output processed yet" msg="Stats populate as the output handler sanitizes model responses." /></Panel>}
        >
          <div className="grid cols-4 gap-14">
            <StatCard label="HTML escaped" icon="code" value={o.html_escaped_count.toLocaleString()} sub="tags neutralized" />
            <StatCard label="Markdown neutralized" icon="filter" value={o.markdown_neutralized_count} sub="link/image vectors" />
            <StatCard label="Structured rejections" icon="alert" value={o.structured_rejections} sub="schema violations" />
            <StatCard label="PII redactions" icon="eye" value={o.pii.total_redactions.toLocaleString()} sub="across all detectors" />
          </div>

          <SectionLabel
            right={
              <span className="flex items-center gap-8" style={{ fontSize: 12 }}>
                <StatusDot status={o.pii_available ? "engaged" : "degraded"} />
                <span className="muted">pii-redactor {o.pii_available ? "available" : "absent"}</span>
              </span>
            }
          >
            PII redactions by detector
          </SectionLabel>
          <Panel pad>
            <Charts.BarBreakdown items={detectorBars} />
          </Panel>

          <SectionLabel>Handler configuration</SectionLabel>
          <Panel pad>
            <div className="flex col gap-16">
              <div className="flex items-center justify-between gap-16">
                <div className="toggle-label">
                  <div className="tl-name">Sanitize HTML</div>
                  <div className="tl-hint">Escape HTML so model output can't inject markup / stored-XSS.</div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="segmented" role="group" aria-label="HTML mode">
                    <button className={htmlMode === "escape" ? "on" : ""} onClick={() => { setHtmlMode("escape"); mark(); }} aria-pressed={htmlMode === "escape"}>Escape</button>
                    <button className={htmlMode === "allowlist" ? "on" : ""} onClick={() => { setHtmlMode("allowlist"); mark(); }} aria-pressed={htmlMode === "allowlist"}>Allowlist</button>
                  </div>
                  <Toggle on={sanitizeHtml} onChange={(v) => { setSanitizeHtml(v); mark(); }} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-16">
                <div className="toggle-label">
                  <div className="tl-name">Neutralize markdown</div>
                  <div className="tl-hint">Defang markdown link/image targets — the classic data-exfiltration vector.</div>
                </div>
                <Toggle on={neutralizeMd} onChange={(v) => { setNeutralizeMd(v); mark(); }} />
              </div>
              <div className="flex items-center justify-between gap-16">
                <div className="toggle-label">
                  <div className="tl-name">Redact PII</div>
                  <div className="tl-hint">Delegated to padosoft/laravel-pii-redactor when present.</div>
                </div>
                <Toggle on={redactPii} onChange={(v) => { setRedactPii(v); mark(); }} disabled={!o.pii_available} />
              </div>
              {!o.pii_available && (
                <Banner kind="warn">PII redaction unavailable — <span className="mono">padosoft/laravel-pii-redactor</span> is not installed. Output is still HTML/markdown sanitized.</Banner>
              )}
            </div>
          </Panel>
        </Region>

        {dirty && (
          <div className="sticky-save">
            <Icon name="info" size={16} />
            <span className="grow" style={{ fontSize: 13 }}>You have unsaved output-handler changes.</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { setSanitizeHtml(o.sanitize_html); setHtmlMode(o.html_mode); setNeutralizeMd(o.neutralize_markdown); setRedactPii(o.redact_pii); setDirty(false); }}>Discard</button>
            <button className="btn btn-sm btn-primary" onClick={save}><Icon name="check" size={14} /> Save changes</button>
          </div>
        )}
      </div>
    );
  }

  window.Pages = Object.assign(window.Pages || {}, { Dashboard, InjectionAudit, ToolFirewall, OutputHandler });
})();
