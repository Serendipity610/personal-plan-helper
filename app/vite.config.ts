import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    // Tauri expects a fixed port; fail if that port is not available
    strictPort: true,
  },
  // Env variables starting with TAURI_ will be exposed to tauri's source code
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri v2 uses Chromium on Windows (primary target)
    target: "chrome105",
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
