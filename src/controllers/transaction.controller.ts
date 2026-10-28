import { NextFunction, Request, Response } from "express";
import TransactionService from "../services/transaction.service";
import TransactionValidator from "../validators/transaction.validator";
import { MethodNotAllowedError } from "../errors/AppError";
import Presenter from "../utils/presenter";

export default class TransactionController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = TransactionValidator.validateCreate(req.params.accountId, req.body);
      const { transaction, duplicate } = TransactionService.add(input);

      res.status(duplicate ? 200 : 201).json({
        message: duplicate ? "Transaction already exists" : "Transaction created",
        duplicate,
        data: Presenter.transaction(transaction),
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = TransactionValidator.validateList(req.params.accountId, req.query);
      const result = TransactionService.getHistory(query);

      res.status(200).json({
        data: result.items.map(Presenter.transaction),
        pagination: {
          current_page: result.page,
          page_size: result.limit,
          total_records: result.total,
          total_pages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId, transactionId } = TransactionValidator.validateIds(
        req.params.accountId,
        req.params.transactionId
      );
      res.status(200).json({
        data: Presenter.transaction(TransactionService.getById(accountId, transactionId)),
      });
    } catch (error) {
      next(error);
    }
  }

  static async immutable(_req: Request, res: Response, next: NextFunction): Promise<void> {
    res.setHeader("Allow", "GET, POST");
    next(new MethodNotAllowedError("Transactions are immutable and cannot be modified or deleted"));
  }
}
