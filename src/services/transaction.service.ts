import { randomUUID } from "node:crypto";
import Database from "../config/database";
import AccountRepository from "../repositories/account.repository";
import TransactionRepository from "../repositories/transaction.repository";
import AccountService from "./account.service";
import { InsufficientBalanceError, NotFoundError } from "../errors/AppError";
import {
  CreateTransactionInput,
  Paginated,
  TransactionHistoryQuery,
  TransactionRow,
} from "../types";

export default class TransactionService {
  // Inserting the transaction and updating the balance happen in one database
  // transaction, so a failure in either step leaves nothing behind.
  static add(input: CreateTransactionInput): { transaction: TransactionRow; duplicate: boolean } {
    return Database.runInTransaction(() => {
      const account = AccountService.getById(input.accountId);

      const existing = TransactionRepository.findByReference(input.accountId, input.referenceId);
      if (existing) return { transaction: existing, duplicate: true };

      const newBalance =
        input.type === "credit" ? account.balance + input.amount : account.balance - input.amount;
      if (newBalance < 0) {
        throw new InsufficientBalanceError("Insufficient balance for this debit");
      }

      const transaction = TransactionRepository.create({
        id: randomUUID(),
        account_id: input.accountId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        reference_id: input.referenceId,
        created_at: new Date().toISOString(),
      });
      AccountRepository.updateBalance(input.accountId, newBalance);

      return { transaction, duplicate: false };
    });
  }

  static getById(accountId: string, transactionId: string): TransactionRow {
    AccountService.getById(accountId);
    const transaction = TransactionRepository.findById(accountId, transactionId);
    if (!transaction) throw new NotFoundError("Transaction not found");
    return transaction;
  }

  static getHistory(query: TransactionHistoryQuery): Paginated<TransactionRow> {
    AccountService.getById(query.accountId);

    const total = TransactionRepository.count(query.accountId, query.type);
    const items = TransactionRepository.findPaginated(
      query.accountId,
      query.type,
      query.limit,
      (query.page - 1) * query.limit
    );

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
