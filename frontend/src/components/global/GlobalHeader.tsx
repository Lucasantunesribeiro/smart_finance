'use client';

import Link from 'next/link';
import { LocaleToggle } from '@/components/ui/locale-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTranslation } from '@/i18n/locale-context';

export const GlobalHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm text-muted-foreground">
        <Link href="/" className="text-lg font-semibold tracking-wide text-foreground">
          SmartFinance
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline">{t('languageLabel')}</span>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
