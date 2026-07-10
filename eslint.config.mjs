import nextTs from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/.source/**",
    "next-env.d.ts",
    "**/server/dist/**",
    ".agents/**",
  ]),

  {
    settings: {
      next: {
        rootDir: [
          "apps/site/",
          "apps/studio/",
          "apps/docs-platform/",
          "apps/blog-platform/",
          "apps/portfolio/",
        ],
      },
    },

    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
