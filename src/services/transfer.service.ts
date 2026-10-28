import { randomUUID } from "node:crypto";
import Database from "../config/database";
import AccountRepository from "../repositories/account.repository";
import TransactionRepository from "../repositories/transaction.repository";
import { InsufficientBalanceError, NotFoundError, ValidationError } from "../errors/AppError";
import { AccountRow, CreateTransferInput, TransactionRow } from "../types";

export interface TransferResult {
  debit: TransactionRow;
  credit: TransactionRow;
  fromAccount: AccountRow;
  toAccount: AccountRow;
}

export default class TransferService {
  static create(input: CreateTransferInput): TransferResult {
    return Database.runInTransaction(() => {
      const from = AccountRepository.findById(input.fromAccountId);
      if (!from) throw new NotFoundError("Source account not found");
      const to = AccountRepository.findById(input.toAccountId);
      if (!to) throw new NotFoundError("Destination account not found");

      if (from.balance < input.amount) {
        throw new InsufficientBalanceError("Insufficient balance in source account");
      }
      if (!Number.isSafeInteger(to.balance + input.amount)) {
        throw ValidationError.single("amount", "amount would make the destination balance too large");
      }

      const transferId = randomUUID();
      const now = new Date().toISOString();

      const debit = TransactionRepository.create({
        id: randomUUID(),
        account_id: from.id,
        type: "debit",
        amount: input.amount,
        description: input.description,
        reference_id: `transfer:${transferId}:debit`,
        created_at: now,
      });
      const credit = TransactionRepository.create({
        id: randomUUID(),
        account_id: to.id,
        type: "credit",
        amount: input.amount,
        description: input.description,
        reference_id: `transfer:${transferId}:credit`,
        created_at: now,
      });

      AccountRepository.updateBalance(from.id, from.balance - input.amount);
      AccountRepository.updateBalance(to.id, to.balance + input.amount);

      return {
        debit,
        credit,
        fromAccount: { ...from, balance: from.balance - input.amount },
        toAccount: { ...to, balance: to.balance + input.amount },
      };
    });
  }
}
