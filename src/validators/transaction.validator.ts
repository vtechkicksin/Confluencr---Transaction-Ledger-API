import { z } from "zod";
import BaseValidator from "./base.validator";
import { CreateTransactionInput, TransactionHistoryQuery } from "../types";

export default class TransactionValidator {
  private static readonly typeSchema = z.enum(["credit", "debit"], {
    error: "type must be either 'credit' or 'debit'",
  });

  private static readonly createSchema = z.strictObject({
    type: TransactionValidator.typeSchema,
    amount: BaseValidator.amount(),
    description: BaseValidator.optionalDescription(),
    reference_id: BaseValidator.requiredString("reference_id"),
  });

  private static readonly listSchema = z.object({
    type: TransactionValidator.typeSchema.optional(),
    page: BaseValidator.positiveInt("page").default(1),
    limit: BaseValidator.positiveInt("limit").default(10),
  });

  private static readonly accountIdSchema = z.object({ accountId: BaseValidator.id("accountId") });

  static validateCreate(accountId: unknown, body: unknown): CreateTransactionInput {
    const id = TransactionValidator.validateAccountId(accountId);
    const data = BaseValidator.parse(TransactionValidator.createSchema, body ?? {});
    return {
      accountId: id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      referenceId: data.reference_id,
    };
  }

  static validateList(accountId: unknown, query: unknown): TransactionHistoryQuery {
    const id = TransactionValidator.validateAccountId(accountId);
    const data = BaseValidator.parse(TransactionValidator.listSchema, query ?? {});
    return { accountId: id, type: data.type, page: data.page, limit: data.limit };
  }

  private static validateAccountId(accountId: unknown): string {
    return BaseValidator.parse(TransactionValidator.accountIdSchema, { accountId }).accountId;
  }
}
