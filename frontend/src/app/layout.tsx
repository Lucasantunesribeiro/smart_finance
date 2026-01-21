import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { GlobalHeader } from '@/components/global/GlobalHeader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SmartFinance - Enterprise Financial Management',
  description: 'Comprehensive financial management system with real-time analytics and automated reporting',
  keywords: ['finance', 'accounting', 'dashboard', 'reporting', 'analytics'],
  authors: [{ name: 'SmartFinance Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'SmartFinance - Enterprise Financial Management',
    description: 'Comprehensive financial management system with real-time analytics and automated reporting',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <GlobalHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
