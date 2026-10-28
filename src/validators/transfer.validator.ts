import { z } from "zod";
import BaseValidator from "./base.validator";
import { ValidationError } from "../errors/AppError";
import { CreateTransferInput } from "../types";

export default class TransferValidator {
  private static readonly createSchema = z.strictObject({
    from_account_id: BaseValidator.id("from_account_id"),
    to_account_id: BaseValidator.id("to_account_id"),
    amount: BaseValidator.amount(),
    description: BaseValidator.optionalDescription(),
    reference_id: BaseValidator.requiredString("reference_id", 100),
  });

  static validateCreate(body: unknown): CreateTransferInput {
    const data = BaseValidator.parse(TransferValidator.createSchema, body ?? {});
    if (data.from_account_id === data.to_account_id) {
      throw ValidationError.single("to_account_id", "to_account_id must differ from from_account_id");
    }
    return {
      fromAccountId: data.from_account_id,
      toAccountId: data.to_account_id,
      amount: data.amount,
      description: data.description,
      referenceId: data.reference_id,
    };
  }
}
