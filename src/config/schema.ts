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
