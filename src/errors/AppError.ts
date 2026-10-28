import { ZodError } from "zod";

export class AppError extends Error {
  readonly statusCode: number = 500;
  readonly code: string = "INTERNAL_ERROR";
  details?: unknown;
}

export class ValidationError extends AppError {
  override readonly statusCode = 400;
  override readonly code = "VALIDATION_ERROR";

  static fromZod(error: ZodError, message = "Invalid request data"): ValidationError {
    const err = new ValidationError(message);
    err.details = error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
    return err;
  }

  static single(field: string, message: string): ValidationError {
    const err = new ValidationError("Invalid request data");
    err.details = [{ field, message }];
    return err;
  }
}

export class NotFoundError extends AppError {
  override readonly statusCode = 404;
  override readonly code = "NOT_FOUND";
}

export class MethodNotAllowedError extends AppError {
  override readonly statusCode = 405;
  override readonly code = "METHOD_NOT_ALLOWED";
}

export class InsufficientBalanceError extends AppError {
  override readonly statusCode = 422;
  override readonly code = "INSUFFICIENT_BALANCE";
}
