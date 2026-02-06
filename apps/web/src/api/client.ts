const BASE_URL = '/api';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function setStoredAuth(accessToken: string, user: unknown): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearStoredAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}

async function refreshToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const json = await response.json();
  const data = json.data ?? json;
  setStoredAuth(data.accessToken, data.user);
  return data.accessToken;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = { ...headers };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  if (body && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (body) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions);

  // Handle 401 with token refresh
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    if (isRefreshing) {
      // Wait for ongoing refresh
      const newToken = await new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
      requestHeaders.Authorization = `Bearer ${newToken}`;
      fetchOptions.headers = requestHeaders;
      response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions);
    } else {
      isRefreshing = true;
      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        requestHeaders.Authorization = `Bearer ${newToken}`;
        fetchOptions.headers = requestHeaders;
        response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions);
      } catch (error) {
        processQueue(error as Error, null);
        clearStoredAuth();
        window.location.href = '/admin/login';
        throw error;
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData.message ?? errorData.error ?? message;
    } catch {
      // Use default message
    }
    throw new ApiError(message, response.status);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  // Unwrap { data, meta } structure
  return (json.data ?? json) as T;
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
