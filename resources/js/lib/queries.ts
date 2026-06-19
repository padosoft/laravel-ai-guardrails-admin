import { useMutation, useQuery } from '@tanstack/react-query';
import { createContext, createElement, type PropsWithChildren, useContext, useMemo } from 'react';
import { type AiGuardrailsAdminRuntimeConfig } from '../config';
import { createApiClient } from './api/client';
import { aiGuardrailsEndpoints, type AiGuardrailsEndpoints, endpoints } from './api/endpoints';
import { type AuditFilters, type FirewallFilters, type GuardrailSettings, type TrendRange } from './api/types';

export const queryKeys = {
  overview: () => ['agr', 'overview'] as const,
  auditList: (filters: AuditFilters = {}) => ['agr', 'audit', filters] as const,
  auditDetail: (id: number) => ['agr', 'audit', id] as const,
  auditTrend: (range: TrendRange = {}) => ['agr', 'audit', 'trend', range] as const,
  firewall: (filters: FirewallFilters = {}) => ['agr', 'firewall', filters] as const,
  outputStats: (range: TrendRange = {}) => ['agr', 'output', range] as const,
  approvals: () => ['agr', 'approvals'] as const,
  settings: () => ['agr', 'settings'] as const,
  settingsChanges: (limit: number) => ['agr', 'settings', 'changes', limit] as const,
};

const ApiEndpointsContext = createContext<AiGuardrailsEndpoints>(endpoints);

export function ApiEndpointsProvider({
  children,
  config,
}: PropsWithChildren<{ config: AiGuardrailsAdminRuntimeConfig }>) {
  const configured = useMemo(() => aiGuardrailsEndpoints(createApiClient(config)), [config.api_base]);

  return createElement(ApiEndpointsContext.Provider, { value: configured }, children);
}

export function useApiEndpoints(): AiGuardrailsEndpoints {
  return useContext(ApiEndpointsContext);
}

export function useOverview() {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.overview(), queryFn: () => api.overview() });
}

export function useAuditList(filters: AuditFilters = {}) {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.auditList(filters), queryFn: () => api.auditList(filters) });
}

export function useAuditDetail(id: number) {
  const api = useApiEndpoints();
  return useQuery({
    queryKey: queryKeys.auditDetail(id),
    queryFn: () => api.auditDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAuditTrend(range: TrendRange = {}) {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.auditTrend(range), queryFn: () => api.auditTrend(range) });
}

export function useFirewall(filters: FirewallFilters = {}) {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.firewall(filters), queryFn: () => api.firewall(filters) });
}

export function useOutputStats(range: TrendRange = {}) {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.outputStats(range), queryFn: () => api.outputStats(range) });
}

export function useApprovals() {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.approvals(), queryFn: () => api.approvals() });
}

export function useSettings() {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.settings(), queryFn: () => api.settings() });
}

export function useSettingsChanges(limit = 50) {
  const api = useApiEndpoints();
  return useQuery({ queryKey: queryKeys.settingsChanges(limit), queryFn: () => api.settingsChanges(limit) });
}

export function useApprove() {
  const api = useApiEndpoints();
  return useMutation({ mutationFn: (token: string) => api.approve(token) });
}

export function useReject() {
  const api = useApiEndpoints();
  return useMutation({ mutationFn: (token: string) => api.reject(token) });
}

export function useUpdateSettings() {
  const api = useApiEndpoints();
  return useMutation({ mutationFn: (settings: GuardrailSettings) => api.updateSettings(settings) });
}

export function useTryScreen() {
  const api = useApiEndpoints();
  return useMutation({ mutationFn: (prompt: string) => api.tryScreen(prompt) });
}

export function useTrySanitize() {
  const api = useApiEndpoints();
  return useMutation({ mutationFn: (text: string) => api.trySanitize(text) });
}
