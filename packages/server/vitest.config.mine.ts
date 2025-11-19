import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/integration/base.spec.ts",
      "src/utils/password.unit.test.ts",
      "tests/unit/cache-index.test.ts",
      "tests/unit/helpers.test.ts",
      "tests/unit/logchimp-config.test.ts",
    ],
    globals: true,
    environment: "node",
  },
});
