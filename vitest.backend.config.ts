import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/backend/**/*.test.ts"],
    setupFiles: ["tests/backend/setup.ts"],
    globals: true,
    isolate: true,
    testTimeout: 120000,
    hookTimeout: 300000,
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
