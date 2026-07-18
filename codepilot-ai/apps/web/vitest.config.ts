import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: { provider: "v8", include: ["components/**/*.tsx", "lib/**/*.ts"], thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 } }
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } }
});

