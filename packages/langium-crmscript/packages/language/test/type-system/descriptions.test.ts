import { describe, expect, it } from "vitest";
import type { Class } from "../../src/generated/ast.js";
import {
  createBooleanType,
  createClassArrayType,
  createClassType,
  createFunctionType,
  createIntegerType,
  createStringType,
  isBooleanType,
  isClassType,
  isFunctionType,
  isIntegerType,
  isStringType,
  typeToString,
} from "../../src/type-system/descriptions.js";

function createFakeClass(name: string): Class {
  return {
    $type: "Class",
    name,
    constructors: [],
    members: [],
  } as Class;
}

describe("type-system/descriptions", () => {
  it("creates primitive descriptions with matching guards", () => {
    expect(isBooleanType(createBooleanType())).toBe(true);
    expect(isIntegerType(createIntegerType())).toBe(true);
    expect(isStringType(createStringType())).toBe(true);
  });

  it("creates class descriptions and preserves array state", () => {
    const classType = createClassType(createFakeClass("Customer"));
    const arrayType = createClassArrayType(createFakeClass("Customer"));

    expect(isClassType(classType)).toBe(true);
    expect(isClassType(arrayType)).toBe(true);
    expect(arrayType.isArray).toBe(true);
  });

  it("formats function and class types as readable strings", () => {
    const functionType = createFunctionType(createStringType(), [
      { name: "id", type: createIntegerType() },
    ]);

    expect(isFunctionType(functionType)).toBe(true);
    expect(typeToString(createClassType(createFakeClass("Customer")))).toBe("Customer");
    expect(typeToString(functionType)).toBe("(id: Integer) => String");
  });
});
