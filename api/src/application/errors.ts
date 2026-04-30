import { DomainError, type DomainErrorCode } from "../domain";

export type ApplicationErrorCode = DomainErrorCode | "unauthorized";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function unauthorized(message: string): ApplicationError {
  return new ApplicationError("unauthorized", message);
}

export function applicationErrorFromDomain(error: DomainError): ApplicationError {
  return new ApplicationError(error.code, error.message);
}
