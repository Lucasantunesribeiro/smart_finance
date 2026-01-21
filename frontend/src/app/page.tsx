'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/i18n/locale-context';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { localize } = useTranslation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    } else if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
            {localize('🎯 NEXT.JS FUNCIONANDO!', '🎯 NEXT.JS IS WORKING!')}
          </h1>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
            {localize('React Original Carregando...', 'Original React loading...')}
          </h2>
          <div style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>✔</div>
          <p style={{ fontSize: '18px', marginTop: '20px' }}>
            {localize('Design autêntico com sidebar em carregamento', 'Authentic design with loading sidebar')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          {localize('🎯 SUCESSO TOTAL!', '🎯 TOTAL SUCCESS!')}
        </h1>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
          {localize('Next.js React ORIGINAL funcionando!', 'Next.js React ORIGINAL Working!')}
        </h2>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>
          ✔ {localize('Design autêntico com DashboardLayout', 'Authentic design with DashboardLayout')}
        </p>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>
          ✔ {localize('Sidebar com navegação moderna', 'Sidebar with modern navigation')}
        </p>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>
          ✔ {localize('Tema preto/branco original', 'Classic dark/light theme')}
        </p>
        <p style={{ fontSize: '18px', marginBottom: '30px' }}>
          ✔ {localize('Componentes React shadcn/ui', 'shadcn/ui React components')}
        </p>
        <p style={{ fontSize: '16px', opacity: '0.9' }}>
          {localize('Redirecionando para o dashboard autêntico...', 'Redirecting to the authentic dashboard...')}
        </p>
      </div>
    </div>
  );
}
