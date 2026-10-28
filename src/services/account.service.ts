import { randomUUID } from "node:crypto";
import AccountRepository from "../repositories/account.repository";
import { NotFoundError } from "../errors/AppError";
import { AccountRow } from "../types";

export default class AccountService {
  static create(name: string): AccountRow {
    return AccountRepository.create(randomUUID(), name, new Date().toISOString());
  }

  static getById(id: string): AccountRow {
    const account = AccountRepository.findById(id);
    if (!account) throw new NotFoundError("Account not found");
    return account;
  }
}
