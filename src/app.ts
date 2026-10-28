import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import ErrorHandler from "./middlewares/errorHandler";
import { openApiSpec } from "./docs/openapi";

export default class App {
  static create(): Express {
    const app = express();

    app.use(express.json());
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
    app.use("/api", routes);

    app.use(ErrorHandler.notFound);
    app.use(ErrorHandler.handle);

    return app;
  }
}
