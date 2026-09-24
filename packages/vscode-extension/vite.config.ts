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
        // Workspace packages export raw `.ts` source; tsdown externalizes `dependencies` by
        // default, but the extension host can't load `.ts` files, so force everything in.
        alwaysBundle: [/./],
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
        alwaysBundle: [/./],
        onlyBundle: false,
      },
      outDir: "dist/language",
    },
  ],
});
