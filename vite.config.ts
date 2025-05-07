import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.tsx"), // ← updated
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: ["obsidian", "electron"],
      output: {
        globals: {}, // ensure rollup doesn’t try browser globals
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "styles.css";
          return assetInfo.name!;
        },
      },
    },
    outDir: "build", // see step 2
    emptyOutDir: true,
  },
});
