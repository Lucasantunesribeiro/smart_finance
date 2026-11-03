/**
 * Aritmética monetária em centavos inteiros.
 *
 * `number` do JavaScript é ponto flutuante binário: 0.1 + 0.2 === 0.30000000000000004.
 * Para somas, saldos, médias e diferenças de dinheiro, convertemos cada valor para
 * centavos inteiros (exatos até Number.MAX_SAFE_INTEGER ≈ 90 trilhões de reais),
 * operamos sobre inteiros e só voltamos para reais no fim.
 *
 * Arredondamento: metade para longe do zero (1.005 -> 1.01; -0.005 -> -0.01),
 * o mesmo usado no backend (MidpointRounding.AwayFromZero) e no numeric do PostgreSQL.
 */

export type MoneyInput = number | string | null | undefined;

const DECIMAL_PATTERN = /^([+-])?(\d*)(?:\.(\d*))?$/;

/**
 * Converte um valor decimal em texto ("10.50", "-0.005") para centavos inteiros
 * sem passar por multiplicação em float.
 */
function decimalStringToCents(text: string): number | null {
  const match = DECIMAL_PATTERN.exec(text);
  if (!match) return null;

  const [, sign, intPartRaw = '', fracPartRaw = ''] = match;
  if (intPartRaw === '' && fracPartRaw === '') return null;

  const intPart = intPartRaw === '' ? 0 : Number(intPartRaw);
  const fracPadded = (fracPartRaw + '000').slice(0, 3);
  const firstTwo = Number(fracPadded.slice(0, 2));
  const third = Number(fracPadded[2]);
  // Para arredondar em 2 casas com "metade para longe do zero", basta o terceiro dígito:
  // >= 5 sobe um centavo (em módulo); o sinal é aplicado depois.
  const roundUp = third >= 5 ? 1 : 0;

  const cents = intPart * 100 + firstTwo + roundUp;
  return sign === '-' ? -cents : cents;
}

/** Converte reais (number ou texto com ponto decimal) para centavos inteiros. */
export function toCents(value: MoneyInput): number {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    // String(0.1 + 0.2) === "0.30000000000000004": a forma decimal mais curta que
    // representa o double, o que evita o erro de 1.005 * 100 === 100.49999999999999.
    const text = String(value);
    if (/e/i.test(text)) {
      // Notação científica (valores minúsculos ou enormes): fallback seguro.
      const rounded = Math.round(Math.abs(value) * 100);
      return value < 0 ? -rounded : rounded;
    }
    return decimalStringToCents(text) ?? 0;
  }

  return decimalStringToCents(value.trim()) ?? 0;
}

/** Converte centavos inteiros de volta para reais. */
export function fromCents(cents: number): number {
  // Divisão de inteiro por 100 devolve o double mais próximo do valor com 2 casas.
  const result = cents / 100;
  return Object.is(result, -0) ? 0 : result;
}

/** Arredonda um valor em reais para centavos (metade para longe do zero). */
export function roundMoney(value: MoneyInput): number {
  return fromCents(toCents(value));
}

/** Soma valores monetários sem erro de ponto flutuante. */
export function sumMoney(values: readonly MoneyInput[]): number {
  return fromCents(values.reduce<number>((acc, value) => acc + toCents(value), 0));
}

/** a - b sem erro de ponto flutuante. */
export function subtractMoney(a: MoneyInput, b: MoneyInput): number {
  return fromCents(toCents(a) - toCents(b));
}

/** Divide centavos com arredondamento metade-para-longe-do-zero. */
function divideCents(cents: number, divisor: number): number {
  const quotient = cents / divisor;
  const rounded = Math.round(Math.abs(quotient));
  return quotient < 0 ? -rounded : rounded;
}

/** total / count arredondado para centavos; 0 quando count <= 0. */
export function divideMoney(total: MoneyInput, count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return fromCents(divideCents(toCents(total), count));
}

/** Média de valores monetários arredondada para centavos; 0 para lista vazia. */
export function averageMoney(values: readonly MoneyInput[]): number {
  if (values.length === 0) return 0;
  const totalCents = values.reduce<number>((acc, v) => acc + toCents(v), 0);
  return fromCents(divideCents(totalCents, values.length));
}

/**
 * Lê o valor digitado pelo usuário. Aceita "10.50", "10,50" e "1.234,56" (pt-BR).
 * Retorna o valor arredondado para centavos, ou null quando o texto não é um número.
 */
export function parseMoneyInput(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? roundMoney(input) : null;

  let text = input.trim().replace(/\s|R\$/g, '');
  if (text === '') return null;

  if (text.includes(',')) {
    // Formato pt-BR: ponto separa milhar, vírgula separa decimal.
    text = text.replace(/\./g, '').replace(',', '.');
  }

  const cents = decimalStringToCents(text);
  return cents === null ? null : fromCents(cents);
}
