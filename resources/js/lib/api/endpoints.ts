import { AxiosInstance } from 'axios';
import { createApiClient } from './client';
import {
  ApprovalDecision,
  ApprovalsData,
  AuditDetailData,
  AuditFilters,
  AuditListData,
  AuditTrendData,
  FirewallFilters,
  FirewallListData,
  Overview,
  OutputStatsData,
  SanitizeResult,
  ScreenResult,
  SettingsChangesData,
  SettingsData,
  TrendRange,
} from './types';

function params(filters: Record<string, unknown>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | number)]),
  );
}

export function aiGuardrailsEndpoints(client: AxiosInstance = createApiClient()) {
  return {
    async overview(): Promise<Overview> {
      return client.get<Overview>('/overview') as unknown as Promise<Overview>;
    },

    async auditList(filters: AuditFilters = {}): Promise<AuditListData> {
      return client.get<AuditListData>('/audit', { params: params(filters) }) as unknown as Promise<AuditListData>;
    },

    async auditDetail(id: number): Promise<AuditDetailData> {
      return client.get<AuditDetailData>(`/audit/${encodeURIComponent(String(id))}`) as unknown as Promise<AuditDetailData>;
    },

    async auditTrend(range: TrendRange = {}): Promise<AuditTrendData> {
      return client.get<AuditTrendData>('/audit/trend', { params: params(range) }) as unknown as Promise<AuditTrendData>;
    },

    async firewall(filters: FirewallFilters = {}): Promise<FirewallListData> {
      return client.get<FirewallListData>('/firewall', { params: params(filters) }) as unknown as Promise<FirewallListData>;
    },

    async outputStats(range: TrendRange = {}): Promise<OutputStatsData> {
      return client.get<OutputStatsData>('/output/stats', { params: params(range) }) as unknown as Promise<OutputStatsData>;
    },

    async approvals(): Promise<ApprovalsData> {
      return client.get<ApprovalsData>('/approvals') as unknown as Promise<ApprovalsData>;
    },

    async approve(token: string): Promise<ApprovalDecision> {
      return client.post<ApprovalDecision>(`/approvals/${encodeURIComponent(token)}/approve`) as unknown as Promise<ApprovalDecision>;
    },

    async reject(token: string): Promise<ApprovalDecision> {
      return client.post<ApprovalDecision>(`/approvals/${encodeURIComponent(token)}/reject`) as unknown as Promise<ApprovalDecision>;
    },

    async settings(): Promise<SettingsData> {
      return client.get<SettingsData>('/settings') as unknown as Promise<SettingsData>;
    },

    async updateSettings(payload: { settings: Record<string, unknown> }): Promise<SettingsData> {
      return client.put<SettingsData>('/settings', payload) as unknown as Promise<SettingsData>;
    },

    async settingsChanges(limit = 50): Promise<SettingsChangesData> {
      return client.get<SettingsChangesData>('/settings/changes', { params: { limit } }) as unknown as Promise<SettingsChangesData>;
    },

    async tryScreen(prompt: string): Promise<ScreenResult> {
      return client.post<ScreenResult>('/try/screen', { prompt }) as unknown as Promise<ScreenResult>;
    },

    async trySanitize(text: string): Promise<SanitizeResult> {
      return client.post<SanitizeResult>('/try/sanitize', { text }) as unknown as Promise<SanitizeResult>;
    },
  };
}

export type AiGuardrailsEndpoints = ReturnType<typeof aiGuardrailsEndpoints>;
export const endpoints = aiGuardrailsEndpoints();
