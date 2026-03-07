# superoffice-tools (monorepo)

This repository contains tooling for SuperOffice, including a VS Code extension located in `packages/vscode-extension`.

If you’re looking for end-user documentation (features, commands, usage), see:

- `packages/vscode-extension/README.md`

## Prerequisites

- Node.js (a recent LTS is recommended)
- pnpm

This repo enforces pnpm usage (`only-allow pnpm`).

## Install

From the repository root:

1. Install dependencies:

   pnpm install

## Repository layout

- `packages/vscode-extension` — the VS Code extension package

## Develop the VS Code extension

### Run / debug in VS Code

1. Open this repo in VS Code
2. Run `pnpm install` (from the repo root)
3. Start the extension in an Extension Development Host:
   - Use the VS Code Run and Debug view and start the extension, or
   - Press `F5`

The extension entrypoint is:

- `packages/vscode-extension/src/extension.ts`

### Watch / compile

Watch mode (TypeScript):

- pnpm --dir packages/vscode-extension run watch

Compile once:

- pnpm --dir packages/vscode-extension run compile

## Quality checks

From the repository root:

- pnpm run verify

This runs formatting and linting as configured in the root `package.json`.

## Contributing

Pull requests and issues are welcome. Please:

- keep changes focused
- run `pnpm run verify` before submitting

## License

ISC (see package manifests for details).
