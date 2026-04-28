import { invalidRequest } from "./errors";

export function requiredName(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw invalidRequest(`${label} is required.`);
  }

  const name = value.trim();

  if (!name) {
    throw invalidRequest(`${label} cannot be empty.`);
  }

  return name;
}

export function optionalName(value: unknown, label: string) {
  if (value === undefined) {
    return undefined;
  }

  return requiredName(value, label);
}

export function booleanValue(value: unknown, label: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw invalidRequest(`${label} must be a boolean.`);
  }

  return value;
}

export function direction(value: unknown) {
  if (value !== "up" && value !== "down") {
    throw invalidRequest('Direction must be "up" or "down".');
  }

  return value;
}

export function paging(value: unknown, fallback: number, max: number) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw invalidRequest("Paging values must be non-negative integers.");
  }

  return Math.min(parsed, max);
}

export function requiredEmail(value: unknown) {
  if (typeof value !== "string") {
    throw invalidRequest("Email is required.");
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    throw invalidRequest("Email cannot be empty.");
  }

  return email;
}
