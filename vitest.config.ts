import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup/vitest.setup.ts"],
    // Only unit tests — exclude worktrees, e2e (playwright), and node:test files
    include: ["tests/unit/**/*.{spec,test}.{ts,tsx}"],
    exclude: [".worktrees/**", "node_modules/**", "tests/e2e/**", "**/*.node.spec.*"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  }
});
