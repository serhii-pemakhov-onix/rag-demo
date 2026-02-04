import { api } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', { email, password }, { skipAuth: true });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refresh(): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/refresh', undefined, { skipAuth: true });
}

export function getStoredAuth(): { accessToken: string | null; user: User | null } {
  const accessToken = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  let user: User | null = null;
  if (userStr && userStr !== 'undefined') {
    try {
      user = JSON.parse(userStr);
    } catch {
      localStorage.removeItem('user');
    }
  }
  return { accessToken, user };
}

export function setStoredAuth(accessToken: string, user: User): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}
