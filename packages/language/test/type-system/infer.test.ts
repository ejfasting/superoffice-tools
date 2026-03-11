import { describe, expect, it } from "vitest";
import {
  isBinaryExpression,
  isBooleanExpression,
  isNumberExpression,
  isStringExpression,
  isUnaryExpression,
  type Expression,
} from "../../src/generated/ast.js";
import { inferType } from "../../src/type-system/infer.js";
import { parseImplementation } from "../helpers/test-services.js";

async function parseSingleExpression(source: string): Promise<Expression> {
  const document = await parseImplementation(source);
  const [statement] = document.parseResult.value.statements;
  return statement as Expression;
}

describe("type-system/infer", () => {
  it("infers primitive literal expressions", async () => {
    const stringExpression = await parseSingleExpression('"hello";');
    const integerExpression = await parseSingleExpression("1;");
    const floatExpression = await parseSingleExpression("1.5;");
    const booleanExpression = await parseSingleExpression("true;");

    expect(isStringExpression(stringExpression)).toBe(true);
    expect(isNumberExpression(integerExpression)).toBe(true);
    expect(isNumberExpression(floatExpression)).toBe(true);
    expect(isBooleanExpression(booleanExpression)).toBe(true);
    expect(inferType(stringExpression, new Map()).$type).toBe("String");
    expect(inferType(integerExpression, new Map()).$type).toBe("Integer");
    expect(inferType(floatExpression, new Map()).$type).toBe("Float");
    expect(inferType(booleanExpression, new Map()).$type).toBe("Bool");
  });

  it("infers binary operator result types", async () => {
    const addExpression = await parseSingleExpression('1 + "a";');
    const compareExpression = await parseSingleExpression("1 < 2;");

    expect(isBinaryExpression(addExpression)).toBe(true);
    expect(isBinaryExpression(compareExpression)).toBe(true);
    expect(inferType(addExpression, new Map()).$type).toBe("String");
    expect(inferType(compareExpression, new Map()).$type).toBe("Bool");
  });

  it("infers unary expression result types", async () => {
    const bangExpression = await parseSingleExpression("!true;");
    const minusExpression = await parseSingleExpression("-1;");

    expect(isUnaryExpression(bangExpression)).toBe(true);
    expect(isUnaryExpression(minusExpression)).toBe(true);
    expect(inferType(bangExpression, new Map()).$type).toBe("Bool");
    expect(inferType(minusExpression, new Map()).$type).toBe("Integer");
  });

  it.todo("uses declared parameter types when inferring function signatures");
});
