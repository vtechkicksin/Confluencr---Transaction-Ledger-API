import App from "./app";
import Config from "./config/config";
import Database from "./config/database";

Database.connect();

App.create().listen(Config.port, () => {
  console.log(`Ledger API running on http://localhost:${Config.port}`);
  console.log(`API docs:           http://localhost:${Config.port}/api-docs`);
});
