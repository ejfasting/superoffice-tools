import { describe, expect, it, vi } from "vitest";
import type { BinaryExpression, Class } from "../../src/generated/ast.js";
import {
  createClassArrayType,
  createClassType,
  createFunctionType,
  createIntegerType,
  createNilType,
  createStringType,
} from "../../src/type-system/descriptions.js";
import { isAssignable, setErrorMessage } from "../../src/type-system/assignment.js";

function createFakeClass(name: string): Class {
  return {
    $type: "Class",
    name,
    constructors: [],
    members: [],
  } as Class;
}

function createFakeBinaryExpression(): BinaryExpression {
  return {
    $type: "BinaryExpression",
    left: {} as BinaryExpression["left"],
    operator: "=",
    right: {} as BinaryExpression["right"],
  } as BinaryExpression;
}

describe("type-system/assignment", () => {
  it("matches primitive and function types by structure", () => {
    const source = createFunctionType(createStringType(), [
      { name: "value", type: createIntegerType() },
    ]);
    const target = createFunctionType(createStringType(), [
      { name: "id", type: createIntegerType() },
    ]);

    expect(isAssignable(createIntegerType(), createIntegerType())).toBe(true);
    expect(isAssignable(createIntegerType(), createStringType())).toBe(false);
    expect(isAssignable(source, target)).toBe(true);
  });

  it("treats nil as assignable to class types and preserves array mismatches", () => {
    const customer = createFakeClass("Customer");

    expect(isAssignable(createNilType(), createClassType(customer))).toBe(true);
    expect(isAssignable(createClassArrayType(customer), createClassType(customer))).toBe(false);
  });

  it("reports class assignment errors through the validation acceptor", () => {
    const accept = vi.fn();
    const expr = createFakeBinaryExpression();

    setErrorMessage(
      createClassType(createFakeClass("User")),
      createClassType(createFakeClass("Ticket")),
      expr,
      accept,
    );

    expect(accept).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledWith(
      "error",
      "BinaryExpression: Type 'User' is not assignable to type 'Ticket'.",
      expect.objectContaining({
        node: expr,
        property: "right",
      }),
    );
  });
});
