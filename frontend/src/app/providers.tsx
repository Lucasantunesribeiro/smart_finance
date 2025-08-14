'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { SignalRProvider } from '@/hooks/useSignalR';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
            retry: (failureCount, error: unknown) => {
              if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                // Don't retry on 401 Unauthorized
                if (axiosError.response?.status === 401) {
                  return false;
                }
                // Don't retry on 500 Internal Server Error (TEMPORARY FIX)
                if (axiosError.response?.status === 500) {
                  console.warn('500 Error detected - stopping retries to prevent infinite loop');
                  return false;
                }
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: (failureCount, error: unknown) => {
              if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                // Don't retry on 401 Unauthorized  
                if (axiosError.response?.status === 401) {
                  return false;
                }
                // Don't retry on 500 Internal Server Error (TEMPORARY FIX)
                if (axiosError.response?.status === 500) {
                  console.warn('500 Error detected - stopping retries to prevent infinite loop');
                  return false;
                }
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <SignalRProvider>
            {children}
            <Toaster />
          </SignalRProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}