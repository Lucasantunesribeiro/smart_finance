'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/locale-context';
import { Globe } from 'lucide-react';

export const LocaleToggle = () => {
  const { locale, toggleLocale, t } = useTranslation();
  const label = `${t('languageLabel')} – ${t('currentLanguage')}`;

  return (
    <Button variant="ghost" size="icon" onClick={toggleLocale} aria-label={label}>
      <Globe className="h-4 w-4" />
      <span className="sr-only">{label}</span>
      <span className="ml-2 text-xs font-semibold">{locale.toUpperCase()}</span>
    </Button>
  );
};
