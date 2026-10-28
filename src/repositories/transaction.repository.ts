import Database from "../config/database";
import { TransactionRow, TransactionType } from "../types";

export default class TransactionRepository {
  static create(row: TransactionRow): TransactionRow {
    Database.run(
      `INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.account_id,
      row.type,
      row.amount,
      row.description,
      row.reference_id,
      row.created_at
    );
    return row;
  }

  static findById(accountId: string, id: string): TransactionRow | undefined {
    return Database.get<TransactionRow>(
      "SELECT * FROM transactions WHERE account_id = ? AND id = ?",
      accountId,
      id
    );
  }

  static findByReference(accountId: string, referenceId: string): TransactionRow | undefined {
    return Database.get<TransactionRow>(
      "SELECT * FROM transactions WHERE account_id = ? AND reference_id = ?",
      accountId,
      referenceId
    );
  }

  // Latest first. rowid breaks ties between rows created in the same millisecond.
  static findPaginated(
    accountId: string,
    type: TransactionType | undefined,
    limit: number,
    offset: number
  ): TransactionRow[] {
    const { where, params } = TransactionRepository.filter(accountId, type);
    return Database.all<TransactionRow>(
      `SELECT * FROM transactions ${where}
       ORDER BY created_at DESC, rowid DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset
    );
  }

  static count(accountId: string, type: TransactionType | undefined): number {
    const { where, params } = TransactionRepository.filter(accountId, type);
    const row = Database.get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM transactions ${where}`,
      ...params
    );
    return row?.total ?? 0;
  }

  private static filter(accountId: string, type: TransactionType | undefined) {
    return type
      ? { where: "WHERE account_id = ? AND type = ?", params: [accountId, type] }
      : { where: "WHERE account_id = ?", params: [accountId] };
  }
}
