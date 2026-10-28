import { AccountRow, TransactionRow } from "../types";
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
}
