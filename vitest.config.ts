import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/adapters/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "scripts/git-gate.ts", "scripts/test-database.ts"],
    },
  },
});
