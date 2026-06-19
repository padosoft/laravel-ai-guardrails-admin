import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { normalizeApiBase, routeBase, runtimeConfig } from '../../../../resources/js/config';
import { createApiClient, resolveApiBase } from '../../../../resources/js/lib/api/client';
import {
  ApiError,
  FeatureDisabledError,
  NetworkError,
  normalizeApiError,
  ValidationError,
} from '../../../../resources/js/lib/api/errors';
import { server } from '../../support/server';

describe('API client', () => {
  it('unwraps the envelope data', async () => {
    server.use(
      http.get('*/overview', () =>
        HttpResponse.json({
          schema_version: 'ai-guardrails.api.v1',
          schema: 'ai-guardrails.api.v1.overview',
          data: { ok: true },
        }),
      ),
    );

    const client = createApiClient({ api_base: '/ai-guardrails/api' });

    await expect(client.get('/overview')).resolves.toMatchObject({ data: { ok: true } });
  });

  it('normalizes an error envelope into ApiError', async () => {
    server.use(http.get('*/overview', () => HttpResponse.json({ message: 'nope' }, { status: 422 })));

    const client = createApiClient({ api_base: '/ai-guardrails/api' });

    await expect(client.get('/overview')).rejects.toMatchObject({ status: 422 });
  });

  it('resolves the runtime API base without trailing slash', () => {
    expect(resolveApiBase({ api_base: '/custom/api/' })).toBe('/custom/api');
  });

  it('normalizes blank and whitespace-padded runtime config', () => {
    expect(normalizeApiBase('   ')).toBe('/ai-guardrails/api');

    const config = runtimeConfig({
      api_base: ' /custom/api/ ',
      mount_prefix: '/admin/custom/',
      theme_default: 'invalid',
      asset_path: '/assets/admin/',
    });

    expect(config).toEqual({
      api_base: '/custom/api',
      mount_prefix: 'admin/custom',
      theme_default: 'dark',
      asset_path: 'assets/admin',
    });
    expect(routeBase(config)).toBe('/admin/custom');
  });

  it('creates an axios client with credentials enabled', () => {
    const client = createApiClient({ api_base: '/custom/api' });

    expect(client.defaults.baseURL).toBe('/custom/api');
    expect(client.defaults.withCredentials).toBe(true);
  });
});

describe('API errors', () => {
  it('normalizes network errors', () => {
    const normalized = normalizeApiError({ isAxiosError: true, message: 'socket closed' });

    expect(normalized).toBeInstanceOf(NetworkError);
  });

  it('normalizes validation and disabled errors', () => {
    const validation = normalizeApiError({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 422, data: { message: 'Invalid', errors: { prompt: ['Required'] } } },
    });

    const disabled = normalizeApiError({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 404, data: { error: { code: 'not_found', message: 'Not found' } } },
    });

    expect(validation).toBeInstanceOf(ValidationError);
    expect((validation as ValidationError).errors.prompt).toEqual(['Required']);
    expect(disabled).toBeInstanceOf(FeatureDisabledError);
  });

  it('exposes ApiError as the base type', () => {
    expect(normalizeApiError(new Error('boom'))).toBeInstanceOf(ApiError);
  });
});
