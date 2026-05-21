# Langium CRMScript Type-System Analysis

## Key Findings

### Current State

- Type-system functions are **defined but NOT YET integrated** into validation
- `registerValidationChecks()` is **commented out** in crmscript-module.ts line 95
- No validation hooks currently call the type-system functions
- Type-system exists as isolated utilities with no active use

### Type-System Files Role

1. **infer.ts** - Type inference engine for AST nodes
2. **descriptions.ts** - TypeDescription type defs and factories
3. **assignment.ts** - Type compatibility checking + error reporting
4. **operator.ts** - Operator legality checks

### Architecture Flow (Future Intent)

```
Document Parse → AST → Validator (NOT CONFIGURED)
                         ├─ inferType() [infer.ts]
                         ├─ isAssignable() [assignment.ts]
                         └─ isLegalOperation() [operator.ts]
```

### Service Registration

- **Module:** crmscript-module.ts (lines 15-95)
  - Defines CrmscriptValidator class (empty/TODO)
  - Injects validator into services
  - registerValidationChecks() function exists but unused
- **Entry Point:** extension/src/language/main.ts
  - Calls createCrmscriptServices()
  - startLanguageServer() activates LSP

### AST Nodes Requiring Validation

Based on crmscript-implementation.langium:

- BinaryExpression (assignments, operations)
- VariableDeclaration (type inference)
- MemberCall (method/field access)
- FunctionDeclaration (return type)
- MethodMember (parameters)
- UnaryExpression (operators)
- ConstructorCall
- Parameter types

## Test Targets

### High-Priority Functions

1. `inferType()` - Core type inference (42 lines, recursive)
2. `isAssignable()` - Type compatibility (51 lines, complex logic)
3. `isLegalOperation()` - Operator validation (17 lines, lookup based)
4. `inferMemberCall()` - Property/method resolution (19 lines)
5. `inferBinaryExpression()` - Expression type resolution (25 lines)

### Type Creators (helpers)

- createIntegerType, createFloatType, createStringType, createBooleanType
- createClassType, createClassArrayType
- createEnumType, createEnumMemberType
- createFunctionType, createErrorType

## Edge Cases & Risks

### Critical Edge Cases

1. **Recursive Inference** - inferType() may hit recursive definitions
   - Current mitigation: temporary error cache placeholder (line 54)
   - Risk: infinite loops on circular refs

2. **Array Type Handling** - isArray?/arrayOfArray? properties
   - inferMemberCall checks isArray with Class (line 128)
   - Test missing: nested arrays ([] [])

3. **Parameter Type Bug** - inferType called with returnType twice (line 70)
   - Should be: parameter's actual type, not returnType
   - Line 70: `type: inferType(node.returnType.ref, cache)` ← WRONG

4. **Null/Undefined Handling**
   - $nodeDescription?.node could be undefined (line 133, 127)
   - No null checks on element.type references

5. **Class Inheritance** - getClassChain/isAssignable
   - Inheritance walk commented out (line 169)
   - Tests will fail for subclass assignments

6. **Function Type Covariance** - isAssignable() for functions (line 31-48)
   - Currently strict: return type AND params must match exactly
   - Standard languages allow covariant returns

### Runtime Risks

1. **Missing Cache Key Coverage** - cache keyed on AstNode identity
   - Risk: Same node visited in different contexts
2. **Type String Formatting** - typeToString() simple implementation
   - Only handles class names, will show "$type" for errors
3. **Validation Not Wired** - No way to report errors without manual integration
   - setErrorMessage() exists but never called
4. **Implicit Nil Type** - NilExpression parsed but nil assignment rules unclear
   - isNilType allows assignment to any class (line 28-30)
   - Backwards - should be restrictive

### Grammar Edge Cases

1. Implicit type coercion in + operator (String | Integer)
2. = operator in expression context returns right type (line 163)
3. Unary +/- operators assume Integer (line 161)
4. No validation of constructor params vs parameter types

## Validation Integration Needed

### Registration Hook

```typescript
// crmscript-module.ts line 95, uncomment and fix:
registerValidationChecks(Definition);
registerValidationChecks(Implementation);
```

### Validator Implementation Pattern

```typescript
// crmscript-validator.ts - add checks for:
checkVariableDeclaration(decl, accept) {
  const inferredType = inferType(decl, cache);
  if (decl.value) {
    const valueType = inferType(decl.value, cache);
    if (!isAssignable(valueType, inferredType)) {
      accept("error", "Type mismatch...", { node: decl, property: "value" });
    }
  }
}

checkBinaryExpression(expr, accept) {
  if (!isLegalOperation(expr.operator, leftType, rightType)) {
    if (expr.operator === "=") {
      setErrorMessage(rightType, leftType, expr, accept);
    } else {
      accept("error", "Invalid operation...", { node: expr });
    }
  }
}
```

### Cache Management

- Type cache must be per-document (prevent cross-document pollution)
- Currently: cache passed as parameter (good design, just needs initialization)
