'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          if (storedUser) {
            localStorage.removeItem('user');
          }
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const session = await authService.getSession();
        localStorage.setItem('user', JSON.stringify(session.user));
        setUser(session.user);
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Login successful');
    },
    onError: (error) => {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Registration successful');
    },
    onError: (error) => {
      toast.error('Registration failed. Please try again.');
      console.error('Registration error:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      localStorage.removeItem('user');
      setUser(null);
      queryClient.clear();
      toast.success('Logged out successfully');
    },
    onError: (error) => {
      localStorage.removeItem('user');
      setUser(null);
      queryClient.clear();
      console.error('Logout error:', error);
    },
  });

  const login = async (credentials: LoginRequest) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: RegisterRequest) => {
    await registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
