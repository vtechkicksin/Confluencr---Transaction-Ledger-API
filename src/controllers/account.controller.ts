import { NextFunction, Request, Response } from "express";
import AccountService from "../services/account.service";
import AccountValidator from "../validators/account.validator";
import Presenter from "../utils/presenter";
import Money from "../utils/money";

export default class AccountController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = AccountValidator.validateCreate(req.body);
      const account = AccountService.create(name);
      res.status(201).json({ message: "Account created", data: Presenter.account(account) });
    } catch (error) {
      next(error);
    }
  }

  static async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = AccountValidator.validateId(req.params.accountId);
      const account = AccountService.getById(id);
      res.status(200).json({
        data: { account_id: account.id, balance: Money.toMajor(account.balance) },
      });
    } catch (error) {
      next(error);
    }
  }
}
