## Plan: CRMScript Type-System Test Strategy

Build a layered test suite in `packages/langium-crmscript/packages/language` that starts with fast unit tests for `type-system` helpers and then adds parser/validation integration tests through Langium `parseHelper` with `validation: true`. This gives quick feedback on inference/assignment/operator behavior while also proving diagnostics are emitted correctly once validator checks are registered.

**Steps**

1. Phase 1 - Baseline and test harness setup
2. Confirm package-local test baseline in `packages/langium-crmscript/packages/language/package.json` and decide on runner (`vitest`, recommended because Langium docs/examples use it and repo lint config already recognizes vitest globals).
3. Add package-local test scripts (`test`, optional `test:watch`, optional `test:coverage`) and test TypeScript config (`tsconfig.test.json`) that includes `test/**/*` and vitest types.
4. Add `vitest.config.ts` for Node environment and language package path resolution.
5. Phase 2 - Unit tests for type-system core (parallel with Phase 3 scaffolding)
6. Create `packages/langium-crmscript/packages/language/test/type-system/infer.test.ts` focused on `inferType`, `inferBinaryExpression` behavior via AST nodes parsed from short source snippets.
7. Create `packages/langium-crmscript/packages/language/test/type-system/assignment.test.ts` for `isAssignable` and `setErrorMessage` outcomes using explicit type descriptions from `descriptions.ts` factories.
8. Create `packages/langium-crmscript/packages/language/test/type-system/operator.test.ts` for `isLegalOperation` matrix testing (arithmetic, boolean, comparison, unary-like scenarios).
9. Create `packages/langium-crmscript/packages/language/test/type-system/descriptions.test.ts` for constructor/guard symmetry (`createXType` + `isXType`) and `typeToString` snapshots.
10. Phase 3 - Langium integration tests for semantic diagnostics (_parallel with unit test authoring once harness exists_)
11. Add `packages/langium-crmscript/packages/language/test/helpers/test-services.ts` to instantiate language services with `EmptyFileSystem` and expose typed `parseHelper` wrappers for Definition and Implementation roots.
12. Add `packages/langium-crmscript/packages/language/test/validating/type-system-validation.test.ts` to parse representative CRMScript samples with `{ validation: true }` and assert `document.diagnostics` count/messages/severity.
13. Include both positive and negative fixtures: expected-pass declarations/expressions and expected-fail type mismatches/operator misuse/member call misuse.
14. Phase 4 - Coverage for known edge and regression cases
15. Add regression tests for currently fragile paths identified in `infer.ts` and `assignment.ts`: function parameter typing, recursive inference cache behavior, `+` coercion (`string + int`), nil/class assignability semantics, array/class member call resolution.
16. Add TODO-marked pending tests for intentionally unsupported semantics (for example inheritance chain checks if superclass traversal remains disabled), so expectations are explicit and tracked.
17. Phase 5 - Validation wiring and CI confidence gate
18. Decide whether this testing effort includes enabling validator registration now: if yes, register checks in `registerValidationChecks` and call registration in `createCrmscriptServices`; if no, keep integration tests scoped to pure parse/link and keep validation tests skipped/pending with explicit reason.
19. Add CI step to execute language package tests (`pnpm -C packages/langium-crmscript/packages/language test`) after lint/format, and document local test command in package README.
20. Phase 6 - Verification and rollout
21. Run package tests locally, then root lint/format checks, then one end-to-end language-server smoke run to confirm no regression in service startup.
22. Track initial flaky/slow tests and refactor fixtures to keep test runtime low (target under 5 seconds package-local).

**Relevant files**

- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/package.json` - add test scripts and dev dependencies.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/tsconfig.json` - confirm include alignment with test setup.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/tsconfig.test.json` - test compilation scope and vitest types.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/vitest.config.ts` - test runner config.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/src/type-system/infer.ts` - primary inference targets and regression focus.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/src/type-system/assignment.ts` - assignability semantics under test.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/src/type-system/operator.ts` - operator legality matrix.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/src/type-system/descriptions.ts` - type factory/guards and formatting behavior.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/src/crmscript-validator.ts` - validation checks for diagnostics integration tests.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/src/crmscript-module.ts` - validation registration wiring.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/test/helpers/test-services.ts` - shared parse helpers.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/test/type-system/infer.test.ts` - inference unit tests.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/test/type-system/assignment.test.ts` - assignability unit tests.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/test/type-system/operator.test.ts` - operator unit tests.
- `c:/Github/ejfasting/superoffice-tools/packages/langium-crmscript/packages/language/test/validating/type-system-validation.test.ts` - Langium parse+validate integration tests.
- `c:/Github/ejfasting/superoffice-tools/.github/workflows/oxlint.yml` - test execution in CI.

**Verification**

1. Run `pnpm -C packages/langium-crmscript/packages/language test` and confirm all unit/integration tests pass.
2. Run targeted test file repeats (`vitest run test/type-system/infer.test.ts`) to validate determinism and speed.
3. Run validation test cases with `validation: true` and verify expected diagnostics content.
4. Run `pnpm run lint --deny-warnings` at repo root and ensure no new lint issues from tests.
5. Run `pnpm run fmt:check` at repo root.
6. Optional: run coverage and confirm type-system modules are substantially covered before enabling CI gate threshold.

**Decisions**

- Included scope: test strategy for type-system behavior and Langium validation flow, plus CI planning.
- Excluded scope: deep redesign of the type-system semantics themselves (except documenting regressions with tests).
- Recommended test style: small table-driven cases for operator/assignability, fixture-based parse tests for diagnostics.
- Assumption: Implementation and Definition language services can share helper setup but should each have explicit smoke tests for parsing roots.

**Further Considerations**

1. Validation activation timing: Option A register validator now (recommended for true semantic tests). Option B postpone and mark validation tests pending.
2. Failure-first approach: Option A write regression tests before bug fixes in `infer.ts` (recommended). Option B fix first and then add tests.
3. CI strictness: Option A require all tests in PR gate immediately. Option B soft-rollout by running tests non-blocking for first iteration.
