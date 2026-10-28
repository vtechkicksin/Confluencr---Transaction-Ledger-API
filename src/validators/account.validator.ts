import { z } from "zod";
import BaseValidator from "./base.validator";

export default class AccountValidator {
  private static readonly createSchema = z.strictObject({
    name: BaseValidator.requiredString("name"),
  });

  static validateCreate(body: unknown): { name: string } {
    return BaseValidator.parse(AccountValidator.createSchema, body ?? {});
  }

  static validateId(id: unknown): string {
    return BaseValidator.parse(z.object({ accountId: BaseValidator.id("accountId") }), { accountId: id })
      .accountId;
  }
}
