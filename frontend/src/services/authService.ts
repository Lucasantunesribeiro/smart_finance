import { api } from '@/lib/api';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest 
} from '@/types/auth';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Temporarily use simple auth until backend is restarted with fixes
    const response = await api.post<AuthResponse>('/simpleauth/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/simpleauth/refresh', { 
      refreshToken 
    } as RefreshTokenRequest);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true;
      }
      
      // Add padding if necessary
      let payload = parts[1];
      while (payload.length % 4) {
        payload += '=';
      }
      
      const decodedPayload = JSON.parse(atob(payload));
      const currentTime = Date.now() / 1000;
      return decodedPayload.exp < currentTime;
    } catch (error) {
      return true;
    }
  },

  getTokenExpirationTime(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      let payload = parts[1];
      while (payload.length % 4) {
        payload += '=';
      }
      
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload.exp * 1000;
    } catch {
      return null;
    }
  }
};