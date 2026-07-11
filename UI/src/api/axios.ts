import axios from 'axios';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthStorage = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
export const getStoredUser = <T>(): T | null => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
};
export const setStoredUser = (user: unknown): void => localStorage.setItem(USER_KEY, JSON.stringify(user));

// Falls back to '/api' (relative) for local dev, where vite.config.ts proxies
// both /api and /uploads to the backend. In production the frontend and
// backend are on different domains (e.g. Vercel + Railway), so VITE_API_URL
// must be set to the backend's full URL.
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The backend returns uploaded file URLs as root-relative paths
// (/uploads/employees/...); resolve them against the backend's own origin
// rather than wherever the frontend happens to be served from.
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
export function resolveUploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${API_ORIGIN}${path}`;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isAxiosLike = axios.isAxiosError(error);
    const status = isAxiosLike ? error.response?.status : undefined;
    const url = isAxiosLike ? error.config?.url : undefined;

    if (status === 401 && !url?.endsWith('/auth/login')) {
      clearAuthStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
