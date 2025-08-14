import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Handle NaN, null, undefined, or invalid numbers
  if (isNaN(amount) || amount === null || amount === undefined) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
