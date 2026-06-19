export interface AiGuardrailsAdminRuntimeConfig {
  api_base: string;
  mount_prefix: string;
  theme_default: 'dark' | 'light' | string;
  asset_path: string;
}

export interface AiGuardrailsAdminAppProps {
  config?: Partial<AiGuardrailsAdminRuntimeConfig>;
  embedded?: boolean;
}

declare global {
  interface Window {
    __AI_GUARDRAILS_ADMIN__?: Partial<AiGuardrailsAdminRuntimeConfig>;
  }
}

export const DEFAULT_RUNTIME_CONFIG: AiGuardrailsAdminRuntimeConfig = {
  api_base: '/ai-guardrails/api',
  mount_prefix: 'admin/ai-guardrails',
  theme_default: 'dark',
  asset_path: 'vendor/ai-guardrails-admin',
};

export function runtimeConfig(
  overrides?: Partial<AiGuardrailsAdminRuntimeConfig>,
): AiGuardrailsAdminRuntimeConfig {
  const merged = {
    ...DEFAULT_RUNTIME_CONFIG,
    ...(typeof window !== 'undefined' ? window.__AI_GUARDRAILS_ADMIN__ : undefined),
    ...overrides,
  };

  return {
    api_base: normalizeApiBase(merged.api_base),
    mount_prefix: normalizeMountPrefix(merged.mount_prefix),
    theme_default: normalizeTheme(merged.theme_default),
    asset_path: normalizePath(merged.asset_path, DEFAULT_RUNTIME_CONFIG.asset_path),
  };
}

export function routeBase(config: AiGuardrailsAdminRuntimeConfig): string {
  const base = normalizeMountPrefix(config.mount_prefix);

  return base === '' ? '/' : `/${base}`;
}

export function normalizeApiBase(value?: string): string {
  const base = (value ?? DEFAULT_RUNTIME_CONFIG.api_base).trim().replace(/\/+$/g, '');

  return base === '' ? DEFAULT_RUNTIME_CONFIG.api_base : base;
}

function normalizePath(value: string | undefined, fallback: string): string {
  const path = (value ?? fallback).trim().replace(/^\/+|\/+$/g, '');

  return path === '' ? fallback : path;
}

function normalizeMountPrefix(value: string | undefined): string {
  return (value ?? DEFAULT_RUNTIME_CONFIG.mount_prefix).trim().replace(/^\/+|\/+$/g, '');
}

function normalizeTheme(value: string | undefined): 'dark' | 'light' {
  return value === 'light' ? 'light' : 'dark';
}
