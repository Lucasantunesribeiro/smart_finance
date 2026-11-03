import {
  averageMoney,
  divideMoney,
  fromCents,
  parseMoneyInput,
  roundMoney,
  subtractMoney,
  sumMoney,
  toCents,
} from './money';
import { formatCurrency } from './utils';

// Intl usa espaço não separável entre "R$" e o número.
const normalize = (text: string) => text.replace(/ /g, ' ');

describe('money (centavos inteiros)', () => {
  it('soma 0.1 + 0.2 sem erro de ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('mantém o saldo exato após muitas transações', () => {
    const tenCents = Array.from({ length: 1000 }, () => 0.1);
    let floatSum = 0;
    for (const v of tenCents) floatSum += v;

    expect(floatSum).not.toBe(100);
    expect(sumMoney(tenCents)).toBe(100);

    const saldo = sumMoney([1000, 2500.35, -1200.1, -89.99, -0.01, 0.2]);
    expect(saldo).toBe(2210.45);
  });

  it('subtrai sem resíduo', () => {
    expect(0.3 - 0.1).not.toBe(0.2);
    expect(subtractMoney(0.3, 0.1)).toBe(0.2);
    expect(subtractMoney(100, 100.01)).toBe(-0.01);
  });

  it.each([
    [1.005, 1.01], // 1.005 * 100 === 100.49999999999999 em float
    [2.675, 2.68],
    [0.125, 0.13],
    [-0.005, -0.01],
    [10.994, 10.99],
    [0, 0],
  ])('arredonda %p para %p (metade para longe do zero)', (input, expected) => {
    expect(roundMoney(input)).toBe(expected);
  });

  it('converte números e textos para centavos', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents('19.99')).toBe(1999);
    expect(toCents(-45.5)).toBe(-4550);
    expect(toCents(null)).toBe(0);
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(1e-7)).toBe(0);
    expect(fromCents(-0)).toBe(0);
  });

  it('divide e calcula média com arredondamento explícito', () => {
    expect(divideMoney(10, 3)).toBe(3.33);
    expect(divideMoney(20, 3)).toBe(6.67);
    expect(divideMoney(-20, 3)).toBe(-6.67);
    expect(divideMoney(100, 0)).toBe(0);
    expect(averageMoney([0.1, 0.2, 0.3])).toBe(0.2);
    expect(averageMoney([])).toBe(0);
  });

  it.each([
    ['10.50', 10.5],
    ['10,50', 10.5],
    ['1.234,56', 1234.56],
    ['R$ 1.234,56', 1234.56],
    ['0,005', 0.01],
    ['-15,25', -15.25],
    ['abc', null],
    ['', null],
  ])('interpreta a entrada %p como %p', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });
});

describe('formatCurrency', () => {
  it('formata em pt-BR/BRL', () => {
    expect(normalize(formatCurrency(1234.5))).toBe('R$ 1.234,50');
    expect(normalize(formatCurrency(sumMoney([0.1, 0.2])))).toBe('R$ 0,30');
    expect(normalize(formatCurrency(-89.99))).toBe('-R$ 89,99');
  });

  it('exibe valores inválidos e -0 como R$ 0,00', () => {
    expect(normalize(formatCurrency(Number.NaN))).toBe('R$ 0,00');
    expect(normalize(formatCurrency(undefined))).toBe('R$ 0,00');
    expect(normalize(formatCurrency(-0))).toBe('R$ 0,00');
  });
});
