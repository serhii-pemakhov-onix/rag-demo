import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  const response = await api.post<LoginResponse>('/auth/login', { email, password });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refresh(): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/refresh');
  return response.data;
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
