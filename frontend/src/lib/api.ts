import axios, { AxiosError } from 'axios';
import { AuthResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
};

const storeTokens = (data: AuthResponse) => {
  if (typeof window === 'undefined') return;
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
  }
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

api.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toLowerCase();
    const unsafe = !['get', 'head', 'options'].includes(method);
    if (unsafe) {
      const csrfToken = getCookieValue('sf_csrf');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    const accessToken = getAccessToken();
    if (accessToken && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response) {
      if (error.response.status === 400) {
        console.error('[Bad Request] Received HTTP 400');
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = originalRequest?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/simpleauth/login') ||
        requestUrl.includes('/simpleauth/refresh') ||
        requestUrl.includes('/simpleauth/me');
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<AuthResponse>(`${API_BASE_URL}/simpleauth/refresh`, {
          refreshToken,
        }, {
          withCredentials: true,
        });
        storeTokens(refreshResponse.data);
        processQueue(null, refreshResponse.data.accessToken || null);
        if (refreshResponse.data.accessToken && originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.status === 401) {
      return 'Authentication required. Please log in again.';
    }
    
    if (error.response?.status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    }
    
    if (error.response?.status === 404) {
      return 'Resource not found.';
    }
    
    if (error.response && error.response.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }
    
    return error.message || 'An unexpected error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};
