import { describe, expect, it } from "vitest";
import { HttpError, formatError, invalidRequest, notFound } from "../src/errors";
import {
  booleanValue,
  direction,
  optionalName,
  paging,
  requiredName,
} from "../src/validation";

describe("validation helpers", () => {
  it("trims required and optional names", () => {
    expect(requiredName("  Groceries  ", "List name")).toBe("Groceries");
    expect(optionalName("  Milk  ", "Item name")).toBe("Milk");
    expect(optionalName(undefined, "Item name")).toBeUndefined();
  });

  it("rejects empty names", () => {
    expect(() => requiredName(" ", "List name")).toThrow(HttpError);
  });

  it("validates booleans and directions", () => {
    expect(booleanValue(true, "Checked")).toBe(true);
    expect(booleanValue(undefined, "Checked")).toBeUndefined();
    expect(() => booleanValue("true", "Checked")).toThrow(HttpError);
    expect(direction("up")).toBe("up");
    expect(() => direction("left")).toThrow(HttpError);
  });

  it("validates paging values", () => {
    expect(paging(undefined, 3, 50)).toBe(3);
    expect(paging("5", 3, 50)).toBe(5);
    expect(paging("500", 3, 50)).toBe(50);
    expect(() => paging("-1", 3, 50)).toThrow(HttpError);
  });
});

describe("error formatting", () => {
  it("formats known http errors", () => {
    expect(formatError(invalidRequest("Bad input"))).toEqual({
      body: { error: { code: "invalid_request", message: "Bad input" } },
      status: 400,
    });
    expect(formatError(notFound("Missing"))).toEqual({
      body: { error: { code: "not_found", message: "Missing" } },
      status: 404,
    });
  });
});
