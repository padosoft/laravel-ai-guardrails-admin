import {
  Filter,
  FlaskConical,
  Gavel,
  LayoutDashboard,
  List,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { DEMO_STATES, useDemoState } from '../lib/demoState';
import { useApprovals } from '../lib/queries';

interface NavRoute {
  to: string;
  label: string;
  icon: LucideIcon;
  testId: string;
}

interface NavGroup {
  name: string;
  items: NavRoute[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Controls',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, testId: 'agr-nav-dashboard' },
      { to: '/audit', label: 'Injection Audit', icon: List, testId: 'agr-nav-audit' },
      { to: '/firewall', label: 'Tool Firewall', icon: Shield, testId: 'agr-nav-firewall' },
      { to: '/output', label: 'Output Handler', icon: Filter, testId: 'agr-nav-output' },
    ],
  },
  {
    name: 'Ops',
    items: [
      { to: '/approvals', label: 'Approvals', icon: Gavel, testId: 'agr-nav-approvals' },
    ],
  },
  {
    name: 'Configure',
    items: [
      { to: '/settings', label: 'Settings', icon: SettingsIcon, testId: 'agr-nav-settings' },
      { to: '/try', label: 'Try · Sandbox', icon: FlaskConical, testId: 'agr-nav-try' },
    ],
  },
];

const ALL_ROUTES = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.name })));

function readTheme(): 'dark' | 'light' {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') return current;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('agr-theme') === 'light' ? 'light' : 'dark';
    }
  } catch {
    /* localStorage unavailable */
  }
  return 'dark';
}

export function Shell() {
  const location = useLocation();
  const { demo, setDemo } = useDemoState();
  const approvals = useApprovals();
  const pending = approvals.data?.pending.length ?? 0;

  const [theme, setTheme] = useState<'dark' | 'light'>(readTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('agr-theme', theme);
    } catch {
      /* localStorage may be unavailable; data-theme on <html> still applies. */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  // Longest-prefix match so sub-paths like /settings/audit resolve to their parent nav label.
  // Fall back to the index route if no prefix matches.
  const current =
    ALL_ROUTES.filter((r) => r.to === '/' ? location.pathname === '/' : location.pathname.startsWith(r.to))
      .sort((a, b) => b.to.length - a.to.length)[0] ?? ALL_ROUTES[0];

  return (
    <div className="app" data-testid="agr-shell">
      <aside className="sidebar" aria-label="AI Guardrails navigation">
        <div className="brand">
          <div className="brand-mark">
            <Shield size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-name">AI Guardrails</div>
            <div className="brand-sub">Control Plane</div>
          </div>
        </div>
        <nav className="nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.name}>
              <div className="nav-label">{group.name}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const showCount = item.to === '/approvals' && pending > 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    data-testid={item.testId}
                    className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {showCount ? <span className="nav-count danger">{pending}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="suite">Part of the Padosoft AI Suite</div>
          <div style={{ marginTop: 3 }}>laravel-ai-guardrails-admin</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>AI Guardrails</span>
            <span>/</span>
            <span className="here">{current.label}</span>
          </div>
          <div className="topbar-spacer" />
          <div className="segmented" role="group" aria-label="Demo state" data-testid="agr-demo-state">
            {DEMO_STATES.map((state) => (
              <button
                key={state.id}
                type="button"
                className={demo === state.id ? 'on' : ''}
                aria-pressed={demo === state.id}
                onClick={() => setDemo(state.id)}
              >
                {state.label}
              </button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Theme">
            <button
              type="button"
              className="on"
              data-testid="agr-theme-toggle"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>
        <div className="scroll-area" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
