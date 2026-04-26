import "./config";
import cors from "cors";
import express from "express";
import { apiRouter } from "./routes";
import { formatError } from "./errors";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api/v1", apiRouter);

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      const { body, status } = formatError(error);
      response.status(status).json(body);
    },
  );

  return app;
}
