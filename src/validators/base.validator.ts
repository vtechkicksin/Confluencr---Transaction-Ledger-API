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

  static requiredString(field: string, max: number) {
    return z
      .string({ error: (issue) => (issue.input === undefined ? `${field} is required` : `${field} must be a string`) })
      .trim()
      .min(1, `${field} is required`)
      .max(max, `${field} must be at most ${max} characters`);
  }

  static optionalDescription() {
    return z
      .string({ error: "description must be a string" })
      .trim()
      .max(255, "description must be at most 255 characters")
      .default("");
  }

  static amount() {
    return z
      .number({
        error: (issue) =>
          issue.input === undefined ? "amount is required" : "amount must be a number",
      })
      .positive("amount must be greater than 0")
      .max(Money.MAX_MAJOR, `amount must not exceed ${Money.MAX_MAJOR}`)
      .refine(Money.hasValidScale, "amount must have at most 2 decimal places")
      .transform(Money.toMinor);
  }

  static positiveInt(field: string, max?: number) {
    const message = `${field} must be a positive integer`;
    let numeric = z.number().int(message).min(1, message);
    if (max) numeric = numeric.max(max, `${field} must be at most ${max}`);
    return z
      .string({ error: message })
      .regex(/^\d+$/, message)
      .transform(Number)
      .pipe(numeric);
  }
}
