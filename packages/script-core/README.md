# @ejfasting/script-core

Core, framework-agnostic building blocks for working with SuperOffice CRMScript files. Shared logic used across the other packages in this repo (e.g. `vscode-extension`, `langium-crmscript`).

## Design

This package has no root export. Each area of functionality lives in its own file under `src/` and is exposed through its own subpath export, so consumers only pull in what they actually use:

```ts
import { expandIncludes } from "@ejfasting/script-core/includes";
```

As more functionality is added, it should follow the same pattern: a new file under `src/`, its own entry in `vite.config.ts`'s `pack` array, and its own subpath in `package.json`'s `exports`.

Each subpath also has a `source` condition pointing at its TypeScript file. The root `tsconfig.json` (`customConditions`) and the root `vite.config.ts` (`ssr.resolve.conditions`) resolve it, so type-checking and tests in dependent packages use `src/` directly and do not require `dist` to be built. Bundlers and Node use the `import` condition.

## What's in the folder?

- [package.json](./package.json) - The manifest file of this package, including its subpath `exports`.
- [tsconfig.json](./tsconfig.json) - Compiler config used for local type-checking/editor support, extending the [base config](../../tsconfig.json). Not used for the published build.
- [vite.config.ts](./vite.config.ts) - `vp pack` configuration; defines the real entry points and output that get published to `dist`.
- [src/includes.ts](src/includes.ts) - `#include` directive expansion and source-mapping back to the original file(s). Exposed as `@ejfasting/script-core/includes`.
- [src/types.ts](src/types.ts) - Shared types for the includes feature (`IncludeHost`, `IncludeSegment`, `IncludeDirective`, `ExpandResult`).

## Includes

`expandIncludes` / `expandIncludesSync` replace every line of the form `#include "name"` (optionally indented, optionally ending in `;`) with the content of the referenced file, recursively. Directives inside line comments, block comments and string literals are left untouched, as are lines that do not match exactly (single quotes, trailing content). A true include cycle throws; the same file included via several branches is fine.

Reading content is delegated to an `IncludeHost`, which may be synchronous or asynchronous. `expandIncludesSync` throws if the host returns a Promise; the two entry points share a single implementation.

The result contains the expanded text plus `segments`, a source map from expanded offsets back to `{ location, offset }` in the original files:

- `offsetToOriginal(segments, offset)` - resolves an expanded offset to its origin.
- `findSegment(segments, offset)` - returns the underlying segment. Segments from included content carry `includedVia`, the span of the `#include` directive in the root document that pulled them in, so consumers can attribute positions to something the user can actually see.

## Scripts

- `pnpm run bundle` - Builds the publishable output into `dist` via `vp pack`.
- `pnpm run test` - Runs `vp check` (format/lint/type-check) and `vp test` (unit tests).
