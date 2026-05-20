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

1. vscode-extension - Core functionality in VS Code
2. language - Reserved package folder (currently empty)

**Type:** Monorepo (pnpm workspace) | **Languages:** TypeScript | **Frameworks:** VS Code Extension API | **Toolchain:** Vite+ (`vp`) | **Runtime:** Node.js 22.x | **Package Manager:** pnpm (workspace) | **Lint/Format/Type Check:** `vp check` | **CI:** GitHub Actions (`vp install` + `vp check` on push/PR) | **Documentation:** README.md + in-code comments

## Build & Test Requirements

### Prerequisites

- **Vite+ CLI (`vp`)**
- **Node.js:** 22.x
- **pnpm:** Workspace package manager used by Vite+

### Installation

```bash
vp install  # ALWAYS run first
```

### Build Process

1. **Build vscode-extension**:

   ```bash
   cd packages/vscode-extension
   vp pack --minify  # Outputs bundle to dist/
   ```

2. **CI Build Sequence:**
   ```bash
   vp install
   vp check
   ```

### Linting

```bash
vp check
```

## Project Structure

### Monorepo Layout

```
├── .github/workflows/ci.yml   # CI: vp install + vp check
├── package.json               # Root scripts and Vite+ setup
├── pnpm-workspace.yaml        # Workspace and dependency catalogs
├── vite.config.ts             # Root Vite+ check/fmt/lint config
├── packages/
│   ├── vscode-extension/      # Core extension (auth, tree view, commands)
│   └── language/              # Reserved package folder (currently empty)
├── test-workspace/            # Manual test fixtures for extension behavior
```

### Package Details

#### 1. `vscode-extension` (Core Extension)

Authentication, script browsing and download for SuperOffice.

**Structure:** `src/extension.ts` (entry) | `contributes/` ([Contribution Points](https://code.visualstudio.com/api/extension-guides/overview) used in VSCode API) | `providers/` (TreeView, auth, virtual FS) | `services/` (HTTP, authentication, filesystem, script) | `handlers/` (used by the services)
**Output:** `dist/extension.js`

## CI/CD Pipeline

`.github/workflows/ci.yml` runs on push to `main` and on pull requests:

- **CI job:** Vite+ environment setup → `vp install` → `vp check`

## Common Issues

1. **vp not found:** Install Vite+ CLI and verify with `vp --version`
2. **pnpm mismatch:** Use the package manager version declared in root `package.json`

## Development Workflow

1. `vp install`
2. Make code changes
3. Run `vp check` and `vp test`
4. Debug via `.vscode/launch.json` configs: "vscode-extension"

**Rules:**

- ❌ Don't edit `dist/` or `out/` (build outputs)
- ❌ Don't edit `dist/` (build output)
- ✅ Add explicit return types to functions
- ✅ Run `vp check` and `vp test` before committing

## Pre-Commit Checklist

1. ✅ `vp install` (if dependencies changed)
2. ✅ `vp check` and `vp test`
3. ✅ Verify `dist/` output exists when relevant
4. ✅ Don't commit generated files or build artifacts

**Trust these instructions** - Only explore further if information is incomplete or incorrect.
