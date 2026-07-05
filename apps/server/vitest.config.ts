import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "src"),
      },
      {
        find: /^#(.+)$/,
        replacement: path.resolve(__dirname, "src/$1"),
      },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    env: {
      GOOGLE_CLIENT_ID: "dummy-google-client-id",
      GOOGLE_CLIENT_SECRET: "dummy-google-client-secret",
      GITHUB_CLIENT_ID: "dummy-github-client-id",
      GITHUB_CLIENT_SECRET: "dummy-github-client-secret",
      LINKEDIN_CLIENT_ID: "dummy-linkedin-client-id",
      LINKEDIN_CLIENT_SECRET: "dummy-linkedin-client-secret",
    },
  },
});
