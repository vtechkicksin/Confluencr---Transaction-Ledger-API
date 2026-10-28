export type TransactionType = "credit" | "debit";

export interface AccountRow {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface TransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  reference_id: string;
  debit_transaction_id: string;
  credit_transaction_id: string;
  created_at: string;
}

export interface CreateTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId: string;
}

export interface TransactionHistoryQuery {
  accountId: string;
  type?: TransactionType;
  page: number;
  limit: number;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  referenceId: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
