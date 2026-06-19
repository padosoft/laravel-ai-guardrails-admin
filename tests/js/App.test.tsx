import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { Shell } from '../../resources/js/shell/Shell';
import { DemoStateProvider } from '../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../resources/js/lib/queries';
import { runtimeConfig, routeBase } from '../../resources/js/config';
import { renderWithProviders } from './support/render';
import { server } from './support/server';

function ShellHarness() {
  return (
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<div>Overview placeholder</div>} />
            <Route path="/audit" element={<div>Audit placeholder</div>} />
          </Route>
        </Routes>
      </DemoStateProvider>
    </ApiEndpointsProvider>
  );
}

describe('App shell', () => {
  it('renders the shell with all 7 nav links (Change History is not in nav)', () => {
    server.use(http.get('*/approvals', () => HttpResponse.json({
      schema_version: 'ai-guardrails.api.v1', schema: 'x', data: { pending: [] },
    })));

    renderWithProviders(<ShellHarness />);

    const shell = screen.getByTestId('agr-shell');
    const nav = within(shell);
    expect(nav.getByTestId('agr-nav-dashboard')).toBeInTheDocument();
    expect(nav.getByTestId('agr-nav-audit')).toBeInTheDocument();
    expect(nav.getByTestId('agr-nav-firewall')).toBeInTheDocument();
    expect(nav.getByTestId('agr-nav-output')).toBeInTheDocument();
    expect(nav.getByTestId('agr-nav-approvals')).toBeInTheDocument();
    expect(nav.getByTestId('agr-nav-settings')).toBeInTheDocument();
    expect(nav.getByTestId('agr-nav-try')).toBeInTheDocument();
    // Change History is reached via Settings button, not a sidebar nav item
    expect(nav.queryByTestId('agr-nav-changes')).not.toBeInTheDocument();
  });

  it('nav item labels match prototype §2.2 (Overview, Injection Audit, Tool Firewall, Output Handler, Approvals, Settings, Try · Sandbox)', () => {
    server.use(http.get('*/approvals', () => HttpResponse.json({
      schema_version: 'ai-guardrails.api.v1', schema: 'x', data: { pending: [] },
    })));

    renderWithProviders(<ShellHarness />);

    expect(screen.getByTestId('agr-nav-dashboard')).toHaveTextContent('Overview');
    expect(screen.getByTestId('agr-nav-try')).toHaveTextContent('Try · Sandbox');
  });

  it('toggles data-theme on the document element', async () => {
    server.use(http.get('*/approvals', () => HttpResponse.json({
      schema_version: 'ai-guardrails.api.v1', schema: 'x', data: { pending: [] },
    })));

    document.documentElement.setAttribute('data-theme', 'dark');
    renderWithProviders(<ShellHarness />);

    await userEvent.click(screen.getByTestId('agr-theme-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(screen.getByTestId('agr-theme-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('routeBase() + BrowserRouter basename wiring (I3)', () => {
  it('routeBase() derives /admin/ai-guardrails from default mount_prefix', () => {
    const config = runtimeConfig({ mount_prefix: 'admin/ai-guardrails' });
    expect(routeBase(config)).toBe('/admin/ai-guardrails');
  });

  it('routeBase() handles a prefixed mount_prefix with leading/trailing slashes', () => {
    const config = runtimeConfig({ mount_prefix: '/admin/ai-guardrails/' });
    expect(routeBase(config)).toBe('/admin/ai-guardrails');
  });

  it('routeBase() returns / for empty mount_prefix', () => {
    const config = runtimeConfig({ mount_prefix: '' });
    expect(routeBase(config)).toBe('/');
  });
});
