import { NextFunction, Request, Response } from "express";
import TransferService from "../services/transfer.service";
import TransferValidator from "../validators/transfer.validator";
import Presenter from "../utils/presenter";
import Money from "../utils/money";

export default class TransferController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = TransferValidator.validateCreate(req.body);
      const { transfer, fromAccount, toAccount, duplicate } = TransferService.create(input);

      res.status(duplicate ? 200 : 201).json({
        message: duplicate ? "Transfer already exists" : "Transfer completed",
        duplicate,
        data: {
          ...Presenter.transfer(transfer),
          from_account_balance: Money.toMajor(fromAccount.balance),
          to_account_balance: Money.toMajor(toAccount.balance),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
