import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Build scripts run on Node.
    files: ["scripts/**/*.mjs", "*.mjs"],
    languageOptions: {
      globals: Object.fromEntries(
        ["process", "console", "TextEncoder", "TextDecoder", "URL"].map((name) => [
          name,
          "readonly",
        ]),
      ),
    },
  },
  {
    rules: {
      // `_`-prefixed names are deliberately unused (a tuple slot, an ignored argument).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
