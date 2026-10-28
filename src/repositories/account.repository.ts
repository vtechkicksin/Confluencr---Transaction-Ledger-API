import Database from "../config/database";
import { AccountRow } from "../types";

export default class AccountRepository {
  static create(id: string, name: string, createdAt: string): AccountRow {
    Database.run(
      "INSERT INTO accounts (id, name, balance, created_at) VALUES (?, ?, 0, ?)",
      id,
      name,
      createdAt
    );
    return { id, name, balance: 0, created_at: createdAt };
  }

  static findById(id: string): AccountRow | undefined {
    return Database.get<AccountRow>("SELECT * FROM accounts WHERE id = ?", id);
  }

  static updateBalance(id: string, balance: number): void {
    Database.run("UPDATE accounts SET balance = ? WHERE id = ?", balance, id);
  }
}
