// eslint-disable-next-line @typescript-eslint/no-var-requires
const money = require('../money');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transactionCreateSchema, budgetCreateSchema, validate } = require('../validation');

const baseTransaction = {
  description: 'Mercado',
  type: 1,
  categoryId: '6f1c2b8e-3c1a-4d2e-9b7a-1a2b3c4d5e6f',
  accountId: '7a1c2b8e-3c1a-4d2e-9b7a-1a2b3c4d5e6f',
};

describe('money (centavos inteiros)', () => {
  it('soma 0.1 + 0.2 sem erro de ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(money.sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('soma strings NUMERIC vindas do PostgreSQL', () => {
    expect(money.sumMoney(['10.10', '20.20', '-0.30'])).toBe(30);
    expect(money.sumMoney(Array.from({ length: 1000 }, () => '0.10'))).toBe(100);
  });

  it('arredonda metade para longe do zero', () => {
    expect(money.roundMoney(1.005)).toBe(1.01);
    expect(money.roundMoney(-0.005)).toBe(-0.01);
    expect(money.roundMoney('2.675')).toBe(2.68);
  });

  it('subtrai e calcula percentual sem resíduo', () => {
    expect(money.subtractMoney(0.3, 0.1)).toBe(0.2);
    expect(money.percentage(1, 3)).toBe(33.33);
    expect(money.percentage(5, 0)).toBe(0);
  });
});

describe('validação de valores monetários', () => {
  it.each([0, -1, 0.004])('rejeita amount %p', (amount) => {
    const { error } = validate(transactionCreateSchema, { ...baseTransaction, amount });
    expect(error).toBeDefined();
  });

  it('rejeita amount acima de NUMERIC(12,2)', () => {
    const { error } = validate(transactionCreateSchema, { ...baseTransaction, amount: 10000000000 });
    expect(error).toBeDefined();
  });

  it('arredonda amount para centavos', () => {
    const { value, error } = validate(transactionCreateSchema, { ...baseTransaction, amount: 0.1 + 0.2 });
    expect(error).toBeUndefined();
    expect(value.amount).toBe(0.3);

    const rounded = validate(transactionCreateSchema, { ...baseTransaction, amount: 10.005 });
    expect(rounded.value.amount).toBe(10.01);
  });

  it('rejeita orçamento com valor zero', () => {
    const { error } = validate(budgetCreateSchema, { name: 'Casa', allocated: 0 });
    expect(error).toBeDefined();
  });
});
