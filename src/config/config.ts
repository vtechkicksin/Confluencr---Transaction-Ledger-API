export default class Config {
  static readonly port: number = Number(process.env.PORT) || 3000;
  // Use ":memory:" for a throwaway database.
  static readonly dbPath: string = process.env.DB_PATH || "data/ledger.db";
}
