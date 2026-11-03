'use strict';

/**
 * Aritmética monetária em centavos inteiros para o serviço Node.
 *
 * O PostgreSQL devolve NUMERIC como string ("10.50"); somar com Number() acumula erro de
 * ponto flutuante (0.1 + 0.2 = 0.30000000000000004). Aqui cada valor vira centavos
 * inteiros, as contas são feitas sobre inteiros e o resultado volta para reais.
 * Arredondamento: metade para longe do zero, igual ao numeric do PostgreSQL.
 */

/** Limite da coluna transactions.amount / budgets.allocated: NUMERIC(12,2). */
const MAX_AMOUNT = 9999999999.99;

const DECIMAL_PATTERN = /^([+-])?(\d*)(?:\.(\d*))?$/;

function decimalStringToCents(text) {
  const match = DECIMAL_PATTERN.exec(text);
  if (!match) return null;
  const [, sign, intRaw = '', fracRaw = ''] = match;
  if (intRaw === '' && fracRaw === '') return null;

  const intPart = intRaw === '' ? 0 : Number(intRaw);
  const frac = (fracRaw + '000').slice(0, 3);
  const cents = intPart * 100 + Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0);
  return sign === '-' ? -cents : cents;
}

/** Converte reais (number ou string decimal, ex.: vindo do pg) para centavos inteiros. */
function toCents(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    const text = String(value);
    if (/e/i.test(text)) {
      const rounded = Math.round(Math.abs(value) * 100);
      return value < 0 ? -rounded : rounded;
    }
    return decimalStringToCents(text) ?? 0;
  }
  return decimalStringToCents(String(value).trim()) ?? 0;
}

function fromCents(cents) {
  const result = cents / 100;
  return Object.is(result, -0) ? 0 : result;
}

function roundMoney(value) {
  return fromCents(toCents(value));
}

function sumMoney(values) {
  return fromCents(values.reduce((acc, value) => acc + toCents(value), 0));
}

function subtractMoney(a, b) {
  return fromCents(toCents(a) - toCents(b));
}

/** part / total * 100 com 2 casas; 0 quando total é zero. */
function percentage(part, total) {
  const totalCents = toCents(total);
  if (totalCents === 0) return 0;
  const raw = (toCents(part) * 100) / totalCents;
  const rounded = Math.round(Math.abs(raw) * 100) / 100;
  return raw < 0 ? -rounded : rounded;
}

module.exports = {
  MAX_AMOUNT,
  toCents,
  fromCents,
  roundMoney,
  sumMoney,
  subtractMoney,
  percentage,
};
