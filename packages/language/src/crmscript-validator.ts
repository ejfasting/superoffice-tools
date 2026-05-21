import type { AstNode, ValidationAcceptor, ValidationChecks } from "langium";
import type { BinaryExpression, CrmscriptAstType } from "./generated/ast.js";
import type { CrmscriptServices } from "./crmscript-module.js";
import { inferType } from "./type-system/infer.js";
import { isAssignable, setErrorMessage } from "./type-system/assignment.js";
import { TypeDescription } from "./type-system/descriptions.js";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: CrmscriptServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.CrmscriptValidator;
  const checks: ValidationChecks<CrmscriptAstType> = {
    // TODO: Declare validators for your properties
    // See doc : https://langium.org/docs/learn/workflow/create_validations/
    /*
        Element: validator.checkElement
        */
    BinaryExpression: (expr, accept) => validator.checkBinaryExpression(expr, accept),
  };
  registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class CrmscriptValidator {
  // TODO: Add logic here for validation checks of properties
  // See doc : https://langium.org/docs/learn/workflow/create_validations/

  checkBinaryExpression(expr: BinaryExpression, accept: ValidationAcceptor): void {
    const map = this.getTypeCache();

    const left = inferType(expr.left, map);
    const right = inferType(expr.right, map);

    if (!isAssignable(right, left)) {
      setErrorMessage(right, left, expr, accept);
    }
  }

  private getTypeCache(): Map<AstNode, TypeDescription> {
    return new Map();
  }
}
