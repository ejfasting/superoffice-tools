import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: [
    {
      entry: ["src/includes.ts"],
      dts: true,
      format: ["esm"],
      platform: "node",
      outDir: "dist",
    },
  ],
});
