/// <reference types="vitest/config" />
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
    // Bind to IPv4 to match Tauri's devUrl
    host: "127.0.0.1",
    // Tauri expects a fixed port; fail if that port is not available
    strictPort: true,
    // Exclude Rust target dir from Vite's file watcher to prevent EBUSY
    watch: {
      ignored: ["**/src-tauri/**"],
    },
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
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/components/ui/**",
        "src/assets/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
});
