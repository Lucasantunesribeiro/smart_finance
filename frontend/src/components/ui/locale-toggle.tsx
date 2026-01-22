'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/locale-context';
import { Globe } from 'lucide-react';

export const LocaleToggle = () => {
  const { locale, toggleLocale, t } = useTranslation();
  const label = `${t('languageLabel')} – ${t('currentLanguage')}`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      onClick={toggleLocale}
      aria-label={label}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-semibold tracking-wide">{t('currentLanguage')}</span>
    </Button>
  );
};
