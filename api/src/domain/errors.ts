export type DomainErrorCode =
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function forbidden(message: string): DomainError {
  return new DomainError("forbidden", message);
}

export function notFound(message: string): DomainError {
  return new DomainError("not_found", message);
}

export function conflict(message: string): DomainError {
  return new DomainError("conflict", message);
}

export function invalid(message: string): DomainError {
  return new DomainError("invalid", message);
}
