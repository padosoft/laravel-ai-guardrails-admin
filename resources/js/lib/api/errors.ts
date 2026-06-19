import axios from 'axios';

export interface ApiErrorPayload {
  error?: { code?: string; message?: string };
  errors?: Record<string, string[]>;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
    readonly errors: Record<string, string[]> = {},
    readonly payload?: ApiErrorPayload,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(status: number, code: string, message: string, payload: ApiErrorPayload) {
    super(message, status, code, payload.errors ?? {}, payload);
    this.name = 'ValidationError';
  }
}

export class FeatureDisabledError extends ApiError {
  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message, status, 'feature_disabled', {}, payload);
    this.name = 'FeatureDisabledError';
  }
}

export class NotFoundError extends ApiError {
  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message, status, 'not_found', {}, payload);
    this.name = 'NotFoundError';
  }
}

export class AuthExpiredError extends ApiError {
  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message, status, 'auth_expired', {}, payload);
    this.name = 'AuthExpiredError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error') {
    super(message, null, 'network_error');
    this.name = 'NetworkError';
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Unexpected error', null, 'unexpected_error');
  }

  if (!error.response) {
    return new NetworkError(error.message);
  }

  const status = error.response.status;
  const payload = (error.response.data ?? {}) as ApiErrorPayload;
  const message = payload.error?.message ?? payload.message ?? error.message;
  const code = payload.error?.code ?? `http_${status}`;

  if (status === 422) {
    return new ValidationError(status, code, message, payload);
  }

  if (status === 401 || status === 419) {
    return new AuthExpiredError(status, message, payload);
  }

  if (code === 'feature_disabled') {
    return new FeatureDisabledError(status, message, payload);
  }

  if (status === 404) {
    return new NotFoundError(status, message, payload);
  }

  return new ApiError(message, status, code, payload.errors ?? {}, payload);
}
