import { defineConfig } from "vitest/config";

// Vitest's default `include` collects `**/*.spec.ts` as well as `**/*.test.ts`,
// which would sweep up the Playwright specs in e2e/ and fail them with
// "test.describe is not a function". Naming the unit-test directory explicitly
// keeps the two runners in their own lanes: `npm test` is Vitest over tests/,
// `npm run test:e2e` is Playwright over e2e/.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
