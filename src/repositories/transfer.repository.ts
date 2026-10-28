import Database from "../config/database";
import { TransferRow } from "../types";

export default class TransferRepository {
  static create(row: TransferRow): TransferRow {
    Database.run(
      `INSERT INTO transfers (id, from_account_id, to_account_id, amount, description, reference_id,
                              debit_transaction_id, credit_transaction_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.from_account_id,
      row.to_account_id,
      row.amount,
      row.description,
      row.reference_id,
      row.debit_transaction_id,
      row.credit_transaction_id,
      row.created_at
    );
    return row;
  }

  static findByReference(fromAccountId: string, referenceId: string): TransferRow | undefined {
    return Database.get<TransferRow>(
      "SELECT * FROM transfers WHERE from_account_id = ? AND reference_id = ?",
      fromAccountId,
      referenceId
    );
  }
}
