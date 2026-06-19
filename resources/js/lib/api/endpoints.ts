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
  GuardrailSettings,
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
      const response = await client.get<Overview>('/overview');
      return response.data;
    },

    async auditList(filters: AuditFilters = {}): Promise<AuditListData> {
      const response = await client.get<AuditListData>('/audit', { params: params(filters) });
      return response.data;
    },

    async auditDetail(id: number): Promise<AuditDetailData> {
      const response = await client.get<AuditDetailData>(`/audit/${encodeURIComponent(String(id))}`);
      return response.data;
    },

    async auditTrend(range: TrendRange = {}): Promise<AuditTrendData> {
      const response = await client.get<AuditTrendData>('/audit/trend', { params: params(range) });
      return response.data;
    },

    async firewall(filters: FirewallFilters = {}): Promise<FirewallListData> {
      const response = await client.get<FirewallListData>('/firewall', { params: params(filters) });
      return response.data;
    },

    async outputStats(range: TrendRange = {}): Promise<OutputStatsData> {
      const response = await client.get<OutputStatsData>('/output/stats', { params: params(range) });
      return response.data;
    },

    async approvals(): Promise<ApprovalsData> {
      const response = await client.get<ApprovalsData>('/approvals');
      return response.data;
    },

    async approve(token: string): Promise<ApprovalDecision> {
      const response = await client.post<ApprovalDecision>(`/approvals/${encodeURIComponent(token)}/approve`);
      return response.data;
    },

    async reject(token: string): Promise<ApprovalDecision> {
      const response = await client.post<ApprovalDecision>(`/approvals/${encodeURIComponent(token)}/reject`);
      return response.data;
    },

    async settings(): Promise<SettingsData> {
      const response = await client.get<SettingsData>('/settings');
      return response.data;
    },

    async updateSettings(settings: GuardrailSettings): Promise<SettingsData> {
      const response = await client.put<SettingsData>('/settings', settings);
      return response.data;
    },

    async settingsChanges(limit = 50): Promise<SettingsChangesData> {
      const response = await client.get<SettingsChangesData>('/settings/changes', { params: { limit } });
      return response.data;
    },

    async tryScreen(prompt: string): Promise<ScreenResult> {
      const response = await client.post<ScreenResult>('/try/screen', { prompt });
      return response.data;
    },

    async trySanitize(text: string): Promise<SanitizeResult> {
      const response = await client.post<SanitizeResult>('/try/sanitize', { text });
      return response.data;
    },
  };
}

export type AiGuardrailsEndpoints = ReturnType<typeof aiGuardrailsEndpoints>;
export const endpoints = aiGuardrailsEndpoints();
