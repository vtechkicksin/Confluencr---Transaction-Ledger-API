import { z } from "zod";
import { ValidationError } from "../errors/AppError";
import Money from "../utils/money";

export default class BaseValidator {
  static parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
    const result = schema.safeParse(data);
    if (!result.success) throw ValidationError.fromZod(result.error);
    return result.data;
  }

  static id(field: string) {
    return z.uuid({ error: `${field} must be a valid UUID` });
  }

  static requiredString(field: string) {
    return z
      .string({ error: (issue) => (issue.input === undefined ? `${field} is required` : `${field} must be a string`) })
      .trim()
      .min(1, `${field} is required`);
  }

  static optionalDescription() {
    return z
      .string({ error: "description must be a string" })
      .trim()
      .default("");
  }

  static amount() {
    return z
      .number({
        error: (issue) =>
          issue.input === undefined ? "amount is required" : "amount must be a number",
      })
      .positive("amount must be greater than 0")
      .refine(Money.hasValidScale, "amount must have at most 2 decimal places")
      .transform(Money.toMinor)
      .pipe(
        z
          .number()
          .min(1, "amount must be at least 0.01")
          .refine(Number.isSafeInteger, "amount is too large")
      );
  }

  static positiveInt(field: string) {
    const message = `${field} must be a positive integer`;
    const numeric = z.number().int(message).min(1, message);
    return z
      .string({ error: message })
      .regex(/^\d+$/, message)
      .transform(Number)
      .pipe(numeric);
  }
}
