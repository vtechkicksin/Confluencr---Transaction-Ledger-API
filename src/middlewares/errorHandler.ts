import { NextFunction, Request, Response } from "express";
import { AppError, NotFoundError } from "../errors/AppError";

export default class ErrorHandler {
  static notFound(req: Request, _res: Response, next: NextFunction): void {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  }

  static handle(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST_BODY", message: "Request body is not valid JSON" },
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  }
}
