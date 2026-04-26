import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["api/src/**/*.ts", "shared/src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    environment: "node",
    globals: true,
    include: ["api/**/*.test.ts"],
    fileParallelism: false,
    pool: "forks",
    testTimeout: 30000,
  },
});
