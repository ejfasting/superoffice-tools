import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: [
    {
      entry: ["src/extension.ts"],
      dts: false,
      format: ["cjs"],
      platform: "node",
      fixedExtension: false,
      deps: {
        neverBundle: ["vscode"],
        onlyBundle: false,
      },
      outDir: "dist",
    },
    {
      entry: ["src/language/main.ts"],
      dts: false,
      format: ["esm"],
      platform: "node",
      fixedExtension: true,
      deps: {
        onlyBundle: false,
      },
      outDir: "dist/language",
    },
  ],
});
