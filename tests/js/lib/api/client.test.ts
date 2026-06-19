import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { normalizeApiBase, routeBase, runtimeConfig } from '../../../../resources/js/config';
import { createApiClient, resolveApiBase } from '../../../../resources/js/lib/api/client';
import {
  ApiError,
  FeatureDisabledError,
  NetworkError,
  NotFoundError,
  normalizeApiError,
  ValidationError,
} from '../../../../resources/js/lib/api/errors';
import { server } from '../../support/server';

describe('API client', () => {
  it('unwraps the envelope data — resolves to the bare inner payload', async () => {
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

    // The interceptor must return response.data.data (the bare payload),
    // NOT the full AxiosResponse — so the resolved value IS { ok: true }.
    await expect(client.get('/overview')).resolves.toEqual({ ok: true });
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

  it('creates an axios client with credentials and explicit XSRF wiring', () => {
    const client = createApiClient({ api_base: '/custom/api' });

    expect(client.defaults.baseURL).toBe('/custom/api');
    expect(client.defaults.withCredentials).toBe(true);
    expect(client.defaults.xsrfCookieName).toBe('XSRF-TOKEN');
    expect(client.defaults.xsrfHeaderName).toBe('X-XSRF-TOKEN');
  });

  it('routeBase() derives the correct basename from mount_prefix', () => {
    expect(routeBase(runtimeConfig({ mount_prefix: 'admin/ai-guardrails' }))).toBe('/admin/ai-guardrails');
    expect(routeBase(runtimeConfig({ mount_prefix: '' }))).toBe('/');
    expect(routeBase(runtimeConfig({ mount_prefix: '/admin/ai-guardrails/' }))).toBe('/admin/ai-guardrails');
  });
});

describe('API errors', () => {
  it('normalizes network errors', () => {
    const normalized = normalizeApiError({ isAxiosError: true, message: 'socket closed' });

    expect(normalized).toBeInstanceOf(NetworkError);
  });

  it('maps 422 to ValidationError', () => {
    const validation = normalizeApiError({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 422, data: { message: 'Invalid', errors: { prompt: ['Required'] } } },
    });

    expect(validation).toBeInstanceOf(ValidationError);
    expect((validation as ValidationError).errors.prompt).toEqual(['Required']);
  });

  it('maps 404 with code=feature_disabled to FeatureDisabledError', () => {
    const disabled = normalizeApiError({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 404, data: { error: { code: 'feature_disabled', message: 'Feature off' } } },
    });

    expect(disabled).toBeInstanceOf(FeatureDisabledError);
  });

  it('maps 409 with code=feature_disabled to FeatureDisabledError', () => {
    const disabled = normalizeApiError({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 409, data: { error: { code: 'feature_disabled', message: 'Feature off' } } },
    });

    expect(disabled).toBeInstanceOf(FeatureDisabledError);
  });

  it('maps plain 404 (no feature_disabled code) to NotFoundError, NOT FeatureDisabledError', () => {
    const notFound = normalizeApiError({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 404, data: { error: { code: 'not_found', message: 'Not found' } } },
    });

    expect(notFound).toBeInstanceOf(NotFoundError);
    expect(notFound).not.toBeInstanceOf(FeatureDisabledError);
  });

  it('maps plain 404 with no error body to NotFoundError', () => {
    const notFound = normalizeApiError({
      isAxiosError: true,
      message: 'Not Found',
      response: { status: 404, data: {} },
    });

    expect(notFound).toBeInstanceOf(NotFoundError);
    expect(notFound).not.toBeInstanceOf(FeatureDisabledError);
  });

  it('exposes ApiError as the base type', () => {
    expect(normalizeApiError(new Error('boom'))).toBeInstanceOf(ApiError);
  });
});
