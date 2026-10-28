import { randomUUID } from "node:crypto";
import AccountRepository from "../repositories/account.repository";
import { NotFoundError } from "../errors/AppError";
import { AccountRow } from "../types";

export default class AccountService {
  static create(name: string): AccountRow {
    // Balance is never taken from the client: new accounts always start at 0.
    return AccountRepository.create(randomUUID(), name, new Date().toISOString());
  }

  static getById(id: string): AccountRow {
    const account = AccountRepository.findById(id);
    if (!account) throw new NotFoundError("Account not found");
    return account;
  }
}
