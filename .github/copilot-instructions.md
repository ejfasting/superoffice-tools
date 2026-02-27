# Copilot Instructions for SuperOffice Tools

# Global Instructions

Apply the [general copilot instructions](./global-copilot-instructions.md) to all code.

## TypeScript Guidelines

- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- Explicit function return types, no-any.

## Repository Overview

Monorepo containing:

1. vscode-extension - Core functionality in vscode

**Type:** Monorepo (pnpm workspace) | **Languages:** TypeScript | **Frameworks:** VS Code Extension API | **Size:** | **Runtime:** Node.js 22.x | **Package Manager:** pnpm 10.x (REQUIRED) | **Linting:** Oxlint | **CI:** GitHub Actions (test + lint on push/PR to main/develop) | **Code Style:** oxfmt | **Documentation:** README.md + in-code comments

## Build & Test Requirements

### Prerequisites

- **Node.js:** 22.x | **pnpm:** 10.x (install: `npm install -g pnpm@10`)
- **Critical:** ONLY pnpm works - npm/yarn will fail due to workspace config and preinstall hooks

### Installation

```bash
pnpm install  # ALWAYS run first
```

### Build Process

1. **Build vscode-extension**:

   ```bash
   pnpm run compile  # Outputs to {workspaceFolder}/packages/vscode-extension/out/
   ```

2. **CI Build Sequence:**
   ```bash
   pnpm install --frozen-lockfile
   pnpm run lint --deny-warnings
   pnpm run fmt:check
   ```

### Linting

```bash
pnpm run lint --deny-warnings  # Treat warnings as errors
pnpm run fmt:check
```

## Project Structure

### Monorepo Layout

```
├── .github/workflows/ci.yml    # CI: lint + formatting jobs
├── packages/                   # 1 packages
│   ├── vscode-extension/      # Core extension (auth, tree view, commands)
├── .oxfmtrc.json, .oxlintrc.json, pnpm-workspace.yaml, .gitignore
```

### Package Details

#### 1. `vscode-extension` (Core Extension)

Authentication, script browsing and download for SuperOffice.

**Structure:** `src/extension.ts` (entry) | `contributes/` ([Contribution Points](https://code.visualstudio.com/api/extension-guides/overview) used in VSCode API) | `providers/` (TreeView, auth, virtual FS) | `services/` (HTTP, authentication, filesystem, script) | `handlers/` (used by the services)
**Output:** `dist/extension.js`

## CI/CD Pipeline

`.github/workflows/ci.yml` runs on push/PR to `main`, `develop`:

- **Test install Job:** pnpm@10 + Node 22.x → `pnpm install --frozen-lockfile`
- **Lint Job:** pnpm@10 + Node 22.x → `pnpm run lint --deny-warnings` → `pnpm eslint .`
- **Formatting Job:** pnpm@10 + Node 22.x → `pnpm run fmt:check`

## Common Issues

1. **pnpm not found:** Install globally: `npm install -g pnpm@8`

## Development Workflow

1. `pnpm install`
2. Make code changes
3. Run `pnpm run lint` and `pnpm run fmt:check`
4. Debug via `.vscode/launch.json` configs: "vscode-extension"

**Rules:**

- ❌ Don't edit `dist/` or `out/` (build outputs)
- ✅ Add explicit return types to functions
- ✅ Run `pnpm run lint` and `pnpm run fmt:check` before committing

## Pre-Commit Checklist

1. ✅ `pnpm install` (if dependencies changed)
2. ✅ `pnpm run lint` and `pnpm run fmt:check` (no NEW errors; 22 pre-existing OK)
3. ✅ Verify `dist/`/`out/` outputs exist
4. ✅ Don't commit generated files or build artifacts

**Trust these instructions** - Only explore further if information is incomplete or incorrect.
