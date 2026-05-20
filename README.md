# superoffice-tools

Monorepo for SuperOffice developer tooling, currently centered on the VS Code extension in `packages/vscode-extension`.

For extension usage and feature documentation, see `packages/vscode-extension/README.md`.

## Toolchain

This repository uses **Vite+** as the unified toolchain.

- Primary CLI: `vp`
- Linting/formatting/checks: `vp check`
- Build/pack workflows: `vp pack`
- Testing: `vp test`

Vite+ wraps and coordinates tools such as tsdown, Oxlint, and Oxfmt.

## Prerequisites

- Vite+ CLI (`vp`)
- Node.js (managed or used by Vite+ setup)
- pnpm (workspace package manager)

## Install

Run from repository root:

```bash
vp install
```

## Common commands

Run from repository root unless noted.

```bash
vp check
vp test
```

For package-specific scripts, use Vite+ script runner:

```bash
vp run <script>
```

Examples:

```bash
vp run vscode:package
```

## Develop the VS Code extension

1. Install dependencies with `vp install`.
2. Start watch build for the extension:

   ```bash
   cd packages/vscode-extension
   vp pack --watch --sourcemap
   ```

3. Launch extension debugging in VS Code (Run and Debug or `F5`).

Extension entry point: `packages/vscode-extension/src/extension.ts`.

## Repository structure

```text
.
|- package.json
|- pnpm-workspace.yaml
|- vite.config.ts
|- packages/
|  |- vscode-extension/     # VS Code extension source and packaging
|  |  |- src/
|  |  |- resources/
|  |  |- package.json
|  |- language/             # Reserved package folder (currently empty)
|- test-workspace/          # Local workspace for manual extension testing
```

## CI

CI runs the Vite+ workflow:

```bash
vp install
vp check
```

## Contributing

- Keep changes focused and scoped.
- Run `vp check` and `vp test` before opening a PR.

## License

ISC (see package manifests for details).
