export default class Config {
  static readonly port: number = Number(process.env.PORT) || 3000;
  static readonly dbPath: string = process.env.DB_PATH || "data/ledger.db";
}
