# SuperOffice Tools VS Code Extension

A Visual Studio Code extension providing tools for working with Scripts and ExtraTables in SuperOffice.

## Features

- Authenticate with SuperOffice directly from VS Code

### Scripts

- Browse and view SuperOffice scripts
- Download scripts and folders

### ExtraTables

- Browse and view ExtraTables

## Installation

1. Ensure you have [VS Code](https://code.visualstudio.com/) installed.
2. Install the extension from the marketplace (or build locally):
   - Clone this repository
   - Run `pnpm install` in the root directory
   - Launch VS Code and use `F5` to start in Extension Development mode

## Usage

- Use the command palette (`Ctrl+Shift+P`) to access:
  - Authenticate with SuperOffice
  - View Script Details
  - Download Script
- Explore scripts and tables in the sidebar views

## Development

- Use `pnpm` for dependency management
- Run `pnpm run watch` for live compilation
- Main extension code is in [packages/vscode-extension/src/extension.ts](packages/vscode-extension/src/extension.ts)

## Contributing

Pull requests and issues are welcome! Please follow standard coding conventions and ensure all code is well-documented.

## License

This project is licensed under the ISC License.
