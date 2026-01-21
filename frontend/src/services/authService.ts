import { api } from '@/lib/api';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse
} from '@/types/auth';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Temporarily use simple auth until backend is restarted with fixes
    const response = await api.post<AuthResponse>('/simpleauth/login', credentials);
    if (typeof window !== 'undefined') {
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
      }
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    const response = await api.post<AuthResponse>('/simpleauth/refresh', { refreshToken });
    if (typeof window !== 'undefined') {
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
      }
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/simpleauth/logout');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  async getSession(): Promise<AuthResponse> {
    const response = await api.get<AuthResponse>('/simpleauth/me');
    return response.data;
  }
};
