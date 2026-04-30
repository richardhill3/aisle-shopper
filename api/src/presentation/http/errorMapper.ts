import { ApplicationError } from "../../application";
import { DomainError } from "../../domain";
import {
  forbidden,
  invalidRequest,
  unauthorized,
  type HttpError,
} from "../../errors";

export function mapListSharingError(error: unknown): unknown {
  if (error instanceof ApplicationError || error instanceof DomainError) {
    return mapCleanError(error);
  }

  return error;
}

export function mapCleanError(error: unknown): unknown {
  if (!(error instanceof ApplicationError || error instanceof DomainError)) {
    return error;
  }

  switch (error.code) {
    case "unauthorized":
      return unauthorized(error.message);
    case "forbidden":
      return forbidden(error.message);
    case "conflict":
    case "invalid":
    case "not_found":
      return invalidRequest(error.message);
  }
}
