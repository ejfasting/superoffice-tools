import { defineConfig } from "vite-plus";

const bundleEverything = {
  inputOptions: {
    resolve: {
      conditionNames: ["source", "import", "node", "default"],
    },
  },
  deps: {
    neverBundle: ["vscode"],
    alwaysBundle: [/./],
    onlyBundle: false as const,
  },
};

export default defineConfig({
  pack: [
    {
      ...bundleEverything,
      entry: ["src/extension.ts"],
      dts: false,
      format: ["cjs"],
      platform: "node",
      fixedExtension: false,
      outDir: "dist",
    },
    {
      ...bundleEverything,
      entry: ["src/language/main.ts"],
      dts: false,
      format: ["esm"],
      platform: "node",
      fixedExtension: true,
      outDir: "dist/language",
    },
  ],
});
