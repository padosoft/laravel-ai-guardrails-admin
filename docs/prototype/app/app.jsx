/* ============================================================
   App shell + routing + mount
   ============================================================ */
(function () {
  "use strict";
  const { useState, useEffect, useCallback } = React;
  const Icon = window.Icon;
  const UI = window.UI;
  const P = window.Pages;
  const M = window.MOCK;

  const ROUTES = [
    { path: "/", label: "Dashboard", icon: "dashboard", group: "Overview", el: (p) => <P.Dashboard {...p} /> },
    { path: "/audit", label: "Injection Audit", icon: "list", group: "Controls", el: (p) => <P.InjectionAudit {...p} /> },
    { path: "/firewall", label: "Tool Firewall", icon: "shield", group: "Controls", el: (p) => <P.ToolFirewall {...p} /> },
    { path: "/output", label: "Output Handler", icon: "filter", group: "Controls", el: (p) => <P.OutputHandler {...p} /> },
    { path: "/approvals", label: "Approvals", icon: "gavel", group: "Controls", el: (p) => <P.Approvals {...p} />, count: M.totals.pending_approvals, danger: true },
    { path: "/settings", label: "Settings", icon: "settings", group: "Configure", el: (p) => <P.Settings {...p} /> },
    { path: "/settings/audit", label: "Change History", icon: "history", group: "Configure", el: (p) => <P.SettingsAudit {...p} /> },
    { path: "/try", label: "Try", icon: "flask", group: "Configure", el: (p) => <P.TrySandbox {...p} /> },
  ];

  function useHashRoute() {
    const get = () => {
      const h = window.location.hash.replace(/^#/, "");
      return h || "/";
    };
    const [route, setRoute] = useState(get);
    useEffect(() => {
      const on = () => setRoute(get());
      window.addEventListener("hashchange", on);
      return () => window.removeEventListener("hashchange", on);
    }, []);
    const navigate = useCallback((p) => {
      window.location.hash = p;
    }, []);
    return [route, navigate];
  }

  function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem("ag-theme") || "dark");
    useEffect(() => {
      document.body.setAttribute("data-theme", theme);
      localStorage.setItem("ag-theme", theme);
    }, [theme]);
    return [theme, setTheme];
  }

  function Sidebar({ route, navigate }) {
    const groups = [];
    ROUTES.forEach((r) => {
      let g = groups.find((x) => x.name === r.group);
      if (!g) { g = { name: r.group, items: [] }; groups.push(g); }
      g.items.push(r);
    });
    return (
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="shield" size={19} stroke={2.2} />
          </div>
          <div>
            <div className="brand-name">AI Guardrails</div>
            <div className="brand-sub">Control Plane</div>
          </div>
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="nav-label">{g.name}</div>
              {g.items.map((r) => {
                const active = route === r.path;
                return (
                  <button key={r.path} className={"nav-item" + (active ? " active" : "")} onClick={() => navigate(r.path)} aria-current={active ? "page" : undefined}>
                    <Icon name={r.icon} size={17} />
                    <span>{r.label}</span>
                    {r.count > 0 && <span className={"nav-count" + (r.danger ? " danger" : "")}>{r.count}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="suite">Part of the Padosoft AI Suite</div>
          <div style={{ marginTop: 3 }}>laravel-ai-guardrails · v0.2.0</div>
        </div>
      </aside>
    );
  }

  function ThemeToggle({ theme, setTheme }) {
    return (
      <div className="segmented" role="group" aria-label="Theme">
        <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>
          <Icon name="moon" size={14} /> Dark
        </button>
        <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}>
          <Icon name="sun" size={14} /> Light
        </button>
      </div>
    );
  }

  const DEMO_STATES = [
    { id: "data", label: "Data" },
    { id: "loading", label: "Loading" },
    { id: "empty", label: "Empty" },
    { id: "error", label: "Error" },
  ];
  function DemoSwitch({ demo, setDemo }) {
    return (
      <div className="segmented" role="group" aria-label="Demo state">
        {DEMO_STATES.map((d) => (
          <button key={d.id} className={demo === d.id ? "on" : ""} onClick={() => setDemo(d.id)} aria-pressed={demo === d.id}>
            {d.label}
          </button>
        ))}
      </div>
    );
  }

  function App() {
    const [route, navigate] = useHashRoute();
    const [theme, setTheme] = useTheme();
    const [demo, setDemo] = useState("data");
    const { toasts, push } = UI.useToasts();

    const current = ROUTES.find((r) => r.path === route) || ROUTES[0];

    // reset demo state to data when navigating to keep things sane
    useEffect(() => { setDemo("data"); }, [route]);

    return (
      <div className="app">
        <Sidebar route={route} navigate={navigate} />
        <div className="main">
          <header className="topbar">
            <div className="breadcrumb">
              <span>{current.group}</span>
              <Icon name="chevronRight" size={13} />
              <span className="here">{current.label}</span>
            </div>
            <div className="topbar-spacer" />
            <span className="subtle" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="eye" size={13} /> Demo state
            </span>
            <DemoSwitch demo={demo} setDemo={setDemo} />
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </header>
          <div className="scroll-area" key={route}>
            {current.el({ navigate, demo, push })}
          </div>
        </div>
        <UI.ToastHost toasts={toasts} />
      </div>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
})();
