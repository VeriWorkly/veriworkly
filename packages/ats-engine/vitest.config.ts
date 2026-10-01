import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    // The first DOCX test pays for a cold `mammoth` import, which under parallel load passed 5s.
    testTimeout: 15_000,
  },
});
