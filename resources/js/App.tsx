import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useMemo } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { type AiGuardrailsAdminAppProps, routeBase, runtimeConfig } from './config';
import { ApiEndpointsProvider } from './lib/queries';
import { DemoStateProvider } from './lib/demoState';
import { Shell } from './shell/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { AuditPage } from './pages/AuditPage';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <section data-state="ready" data-testid={`agr-page-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="placeholder">
          <h1>{title}</h1>
          <p>This screen lands in a later task.</p>
        </div>
      </section>
    </div>
  );
}

function Providers({
  children,
  config,
  embedded,
}: PropsWithChildren<
  Required<Pick<AiGuardrailsAdminAppProps, 'embedded'>> & Pick<AiGuardrailsAdminAppProps, 'config'>
>) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
      }),
    [],
  );

  const resolved = runtimeConfig(config);

  const content = (
    <QueryClientProvider client={queryClient}>
      <ApiEndpointsProvider config={resolved}>
        <DemoStateProvider>{children}</DemoStateProvider>
      </ApiEndpointsProvider>
    </QueryClientProvider>
  );

  if (embedded) {
    return <MemoryRouter>{content}</MemoryRouter>;
  }

  return <BrowserRouter basename={routeBase(resolved)}>{content}</BrowserRouter>;
}

export function AiGuardrailsAdminApp({ config, embedded = false }: AiGuardrailsAdminAppProps) {
  const resolved = runtimeConfig(config);

  return (
    <Providers config={resolved} embedded={embedded}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/firewall" element={<Placeholder title="Tool Firewall" />} />
          <Route path="/output" element={<Placeholder title="Output Handler" />} />
          <Route path="/approvals" element={<Placeholder title="Approvals" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
          <Route path="/settings/audit" element={<Placeholder title="Change History" />} />
          <Route path="/try" element={<Placeholder title="Try" />} />
        </Route>
      </Routes>
    </Providers>
  );
}
