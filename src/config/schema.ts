// Amounts and balances are stored as integer minor units (e.g. paise / cents).
// Integrity rules live in the database as well as in the services, so they hold
// even if a bug or a manual query bypasses the application layer.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  type         TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount       INTEGER NOT NULL CHECK (amount > 0),
  description  TEXT NOT NULL DEFAULT '',
  reference_id TEXT NOT NULL CHECK (length(trim(reference_id)) > 0),
  created_at   TEXT NOT NULL,
  UNIQUE (account_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_created
  ON transactions (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transfers (
  id                    TEXT PRIMARY KEY,
  from_account_id       TEXT NOT NULL REFERENCES accounts(id),
  to_account_id         TEXT NOT NULL REFERENCES accounts(id),
  amount                INTEGER NOT NULL CHECK (amount > 0),
  description           TEXT NOT NULL DEFAULT '',
  reference_id          TEXT NOT NULL CHECK (length(trim(reference_id)) > 0),
  debit_transaction_id  TEXT NOT NULL REFERENCES transactions(id),
  credit_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  created_at            TEXT NOT NULL,
  CHECK (from_account_id <> to_account_id),
  UNIQUE (from_account_id, reference_id)
);

-- Transactions are immutable: block any UPDATE or DELETE at the database level.
CREATE TRIGGER IF NOT EXISTS transactions_no_update
BEFORE UPDATE ON transactions
BEGIN
  SELECT RAISE(ABORT, 'Transactions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS transactions_no_delete
BEFORE DELETE ON transactions
BEGIN
  SELECT RAISE(ABORT, 'Transactions are immutable');
END;
`;
