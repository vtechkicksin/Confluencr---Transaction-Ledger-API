import { randomUUID } from "node:crypto";
import Database from "../config/database";
import AccountRepository from "../repositories/account.repository";
import TransactionRepository from "../repositories/transaction.repository";
import TransferRepository from "../repositories/transfer.repository";
import { InsufficientBalanceError, NotFoundError } from "../errors/AppError";
import { AccountRow, CreateTransferInput, TransferRow } from "../types";

export interface TransferResult {
  transfer: TransferRow;
  fromAccount: AccountRow;
  toAccount: AccountRow;
  duplicate: boolean;
}

export default class TransferService {
  static create(input: CreateTransferInput): TransferResult {
    return Database.runInTransaction(() => {
      const from = AccountRepository.findById(input.fromAccountId);
      if (!from) throw new NotFoundError("Source account not found");
      const to = AccountRepository.findById(input.toAccountId);
      if (!to) throw new NotFoundError("Destination account not found");

      const existing = TransferRepository.findByReference(from.id, input.referenceId);
      if (existing) {
        return { transfer: existing, fromAccount: from, toAccount: to, duplicate: true };
      }

      if (from.balance < input.amount) {
        throw new InsufficientBalanceError("Insufficient balance in source account");
      }

      const transferId = randomUUID();
      const now = new Date().toISOString();
      const note = input.description ? `: ${input.description}` : "";

      const debit = TransactionRepository.create({
        id: randomUUID(),
        account_id: from.id,
        type: "debit",
        amount: input.amount,
        description: `Transfer to ${to.name}${note}`,
        reference_id: `transfer:${transferId}:debit`,
        created_at: now,
      });
      const credit = TransactionRepository.create({
        id: randomUUID(),
        account_id: to.id,
        type: "credit",
        amount: input.amount,
        description: `Transfer from ${from.name}${note}`,
        reference_id: `transfer:${transferId}:credit`,
        created_at: now,
      });

      const transfer = TransferRepository.create({
        id: transferId,
        from_account_id: from.id,
        to_account_id: to.id,
        amount: input.amount,
        description: input.description,
        reference_id: input.referenceId,
        debit_transaction_id: debit.id,
        credit_transaction_id: credit.id,
        created_at: now,
      });

      AccountRepository.updateBalance(from.id, from.balance - input.amount);
      AccountRepository.updateBalance(to.id, to.balance + input.amount);

      return {
        transfer,
        fromAccount: { ...from, balance: from.balance - input.amount },
        toAccount: { ...to, balance: to.balance + input.amount },
        duplicate: false,
      };
    });
  }
}
