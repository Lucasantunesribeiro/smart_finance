CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS external_id UUID DEFAULT gen_random_uuid(),
  ADD CONSTRAINT IF NOT EXISTS accounts_external_id_unique UNIQUE (user_id, external_id);

UPDATE accounts SET external_id = gen_random_uuid() WHERE external_id IS NULL;
ALTER TABLE accounts ALTER COLUMN external_id SET NOT NULL;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS external_id UUID DEFAULT gen_random_uuid(),
  ADD CONSTRAINT IF NOT EXISTS categories_external_id_unique UNIQUE (user_id, external_id);

UPDATE categories SET external_id = gen_random_uuid() WHERE external_id IS NULL;
ALTER TABLE categories ALTER COLUMN external_id SET NOT NULL;

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS external_id UUID DEFAULT gen_random_uuid(),
  ADD CONSTRAINT IF NOT EXISTS budgets_external_id_unique UNIQUE (user_id, external_id);

UPDATE budgets SET external_id = gen_random_uuid() WHERE external_id IS NULL;
ALTER TABLE budgets ALTER COLUMN external_id SET NOT NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS external_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS status INT DEFAULT 1,
  ADD CONSTRAINT IF NOT EXISTS transactions_external_id_unique UNIQUE (user_id, external_id);

UPDATE transactions SET external_id = gen_random_uuid() WHERE external_id IS NULL;
ALTER TABLE transactions ALTER COLUMN external_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_external_id_idx ON transactions (external_id);
