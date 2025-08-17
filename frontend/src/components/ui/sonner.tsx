'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export interface ToasterProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  hotkey?: string[];
  richColors?: boolean;
  expand?: boolean;
  duration?: number;
  gap?: number;
  visibleToasts?: number;
  closeButton?: boolean;
  toastOptions?: {
    className?: string;
    style?: React.CSSProperties;
    classNames?: {
      toast?: string;
      title?: string;
      description?: string;
      loader?: string;
      closeButton?: string;
      cancelButton?: string;
      actionButton?: string;
      success?: string;
      error?: string;
      info?: string;
      warning?: string;
    };
  };
  className?: string;
  style?: React.CSSProperties;
  offset?: string | number;
  theme?: 'light' | 'dark' | 'system';
  dir?: 'rtl' | 'ltr' | 'auto';
}

export const Toaster = ({
  position = 'top-center',
  hotkey = ['altKey', 'KeyT'],
  richColors = false,
  expand = false,
  duration = 4000,
  gap = 14,
  visibleToasts = 5,
  closeButton = false,
  toastOptions,
  className,
  style,
  offset,
  theme = 'system',
  dir = 'auto',
}: ToasterProps) => {
  return (
    <SonnerToaster
      position={position}
      hotkey={hotkey}
      richColors={richColors}
      expand={expand}
      duration={duration}
      gap={gap}
      visibleToasts={visibleToasts}
      closeButton={closeButton}
      toastOptions={{
        className: toastOptions?.className,
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          ...toastOptions?.style,
        },
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:text-foreground',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toast]:bg-green-50 group-[.toast]:text-green-900 group-[.toast]:border-green-200',
          error: 'group-[.toast]:bg-red-50 group-[.toast]:text-red-900 group-[.toast]:border-red-200',
          warning: 'group-[.toast]:bg-yellow-50 group-[.toast]:text-yellow-900 group-[.toast]:border-yellow-200',
          info: 'group-[.toast]:bg-blue-50 group-[.toast]:text-blue-900 group-[.toast]:border-blue-200',
          ...toastOptions?.classNames,
        },
      }}
      className={className}
      style={style}
      offset={offset}
      theme={theme}
      dir={dir}
    />
  );
};

// Export toast functions for easy use
export { toast }; 