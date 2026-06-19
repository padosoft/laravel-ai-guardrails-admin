import axios, { AxiosInstance } from 'axios';
import { AiGuardrailsAdminRuntimeConfig, normalizeApiBase, runtimeConfig } from '../../config';
import { normalizeApiError } from './errors';

export function resolveApiBase(config?: Partial<AiGuardrailsAdminRuntimeConfig>): string {
  const envBase = import.meta.env.VITE_API_BASE as string | undefined;

  return normalizeApiBase(envBase || runtimeConfig(config).api_base);
}

export function createApiClient(config?: Partial<AiGuardrailsAdminRuntimeConfig>): AxiosInstance {
  const client = axios.create({
    baseURL: resolveApiBase(config),
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  client.interceptors.response.use(
    // Unwrap the core API envelope { schema_version, schema, data } → data.
    // Guard: only unwrap when the envelope shape is present, so non-enveloped
    // responses (or already-unwrapped test doubles) pass through unchanged.
    (response) => {
      const body = response.data;
      if (body && typeof body === 'object' && 'data' in body && 'schema_version' in body) {
        response.data = (body as { data: unknown }).data;
      }
      return response;
    },
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  );

  return client;
}

export const apiClient = createApiClient();
