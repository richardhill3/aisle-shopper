import type { ApiErrorCode, ApiErrorResponse } from "../../shared/src";

export class HttpError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function invalidRequest(message: string) {
  return new HttpError(400, "invalid_request", message);
}

export function notFound(message: string) {
  return new HttpError(404, "not_found", message);
}

export function unauthorized(message: string) {
  return new HttpError(401, "unauthorized", message);
}

export function forbidden(message: string) {
  return new HttpError(403, "forbidden", message);
}

export function formatError(error: unknown): {
  body: ApiErrorResponse;
  status: number;
} {
  if (error instanceof HttpError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      status: error.status,
    };
  }

  console.error(error);

  return {
    body: {
      error: {
        code: "internal_error",
        message: "Internal server error",
      },
    },
    status: 500,
  };
}
