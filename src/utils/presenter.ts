import { AccountRow, TransactionRow, TransferRow } from "../types";
import Money from "./money";

export default class Presenter {
  static account(row: AccountRow) {
    return {
      id: row.id,
      name: row.name,
      balance: Money.toMajor(row.balance),
      created_at: row.created_at,
    };
  }

  static transaction(row: TransactionRow) {
    return {
      id: row.id,
      account_id: row.account_id,
      type: row.type,
      amount: Money.toMajor(row.amount),
      description: row.description,
      reference_id: row.reference_id,
      created_at: row.created_at,
    };
  }

  static transfer(row: TransferRow) {
    return {
      id: row.id,
      from_account_id: row.from_account_id,
      to_account_id: row.to_account_id,
      amount: Money.toMajor(row.amount),
      description: row.description,
      reference_id: row.reference_id,
      debit_transaction_id: row.debit_transaction_id,
      credit_transaction_id: row.credit_transaction_id,
      created_at: row.created_at,
    };
  }
}
