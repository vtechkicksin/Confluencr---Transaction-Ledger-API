import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import Config from "./config";
import { SCHEMA } from "./schema";

type Param = string | number | null;

export default class Database {
  private static connection: DatabaseSync | null = null;
  private static inTransaction = false;

  static connect(): void {
    if (Database.connection) return;

    if (Config.dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(Config.dbPath), { recursive: true });
    }

    Database.connection = new DatabaseSync(Config.dbPath);
    Database.connection.exec("PRAGMA foreign_keys = ON");
    Database.connection.exec(SCHEMA);
  }

  static close(): void {
    Database.connection?.close();
    Database.connection = null;
  }

  static get<T>(sql: string, ...params: Param[]): T | undefined {
    return Database.db().prepare(sql).get(...params) as T | undefined;
  }

  static all<T>(sql: string, ...params: Param[]): T[] {
    return Database.db().prepare(sql).all(...params) as T[];
  }

  static run(sql: string, ...params: Param[]): void {
    Database.db().prepare(sql).run(...params);
  }

  // Runs `work` as a single atomic unit: everything is committed, or nothing is.
  // BEGIN IMMEDIATE takes the write lock up front so concurrent writers cannot
  // read a stale balance in between our read and our write.
  static runInTransaction<T>(work: () => T): T {
    if (Database.inTransaction) return work();

    const db = Database.db();
    db.exec("BEGIN IMMEDIATE");
    Database.inTransaction = true;
    try {
      const result = work();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      Database.inTransaction = false;
    }
  }

  private static db(): DatabaseSync {
    if (!Database.connection) throw new Error("Database is not connected");
    return Database.connection;
  }
}
