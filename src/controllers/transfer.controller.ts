import { NextFunction, Request, Response } from "express";
import TransferService from "../services/transfer.service";
import TransferValidator from "../validators/transfer.validator";
import Presenter from "../utils/presenter";
import Money from "../utils/money";

export default class TransferController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = TransferValidator.validateCreate(req.body);
      const { debit, credit, fromAccount, toAccount } = TransferService.create(input);

      res.status(201).json({
        message: "Transfer completed",
        data: {
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount: Money.toMajor(debit.amount),
          from_account_balance: Money.toMajor(fromAccount.balance),
          to_account_balance: Money.toMajor(toAccount.balance),
          debit_transaction: Presenter.transaction(debit),
          credit_transaction: Presenter.transaction(credit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
