import { describe, expect, it } from "vitest";
import {
  createBooleanType,
  createIntegerType,
  createStringType,
} from "../../src/type-system/descriptions.js";
import { isLegalOperation } from "../../src/type-system/operator.js";

describe("type-system/operator", () => {
  it("accepts integer and string addition combinations", () => {
    expect(isLegalOperation("+", createIntegerType(), createIntegerType())).toBe(true);
    expect(isLegalOperation("+", createStringType(), createIntegerType())).toBe(true);
    expect(isLegalOperation("+", createStringType(), createStringType())).toBe(true);
  });

  it("rejects invalid arithmetic operands", () => {
    expect(isLegalOperation("-", createStringType(), createIntegerType())).toBe(false);
    expect(isLegalOperation("/", createBooleanType(), createIntegerType())).toBe(false);
  });

  it("enforces boolean operators and unary bang", () => {
    expect(isLegalOperation("and", createBooleanType(), createBooleanType())).toBe(true);
    expect(isLegalOperation("and", createIntegerType(), createBooleanType())).toBe(false);
    expect(isLegalOperation("!", createBooleanType())).toBe(true);
    expect(isLegalOperation("!", createStringType())).toBe(false);
  });
});
