import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Formata dinheiro em pt-BR (padrão BRL): 1234.5 -> "R$ 1.234,50".
 * Valores inválidos (NaN, null, undefined, Infinity) são exibidos como R$ 0,00.
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'BRL'): string {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, formatter);
  }

  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  // Evita exibir "-R$ 0,00" para -0 ou resíduos negativos minúsculos.
  return formatter.format(Object.is(value, -0) || Math.abs(value) < 0.005 ? 0 : value);
}
