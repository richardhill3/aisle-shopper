import cors from "cors";
import express from "express";
import { resolveAuth } from "./auth";
import "./config";
import { formatError } from "./errors";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use((request, _response, next) => {
    console.log(
      `${new Date().toISOString()} ${request.method} ${request.originalUrl}`,
    );
    next();
  });

  app.use(resolveAuth);
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
