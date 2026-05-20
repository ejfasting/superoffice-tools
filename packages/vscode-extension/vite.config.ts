import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/extension.ts"],
    format: ["cjs"],
    platform: "node",
    fixedExtension: false,
    deps: {
      neverBundle: ["vscode"],
      onlyBundle: false,
    },
    outDir: "dist",
  },
});
