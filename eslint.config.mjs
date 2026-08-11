// Flat ESLint config (ESLint 9). Next 16 removed `next lint`, so this is the real lint gate
// wired into CI via `npm run lint`. Type-aware linting is intentionally NOT enabled here —
// `npm run typecheck` (tsc --noEmit) is the authoritative type gate; ESLint focuses on
// correctness/foot-gun rules that tsc does not cover.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    // Not linted: dependencies, build output, generated files, and non-JS assets.
    ignores: [
      "node_modules/**",
      // Vendored third-party marketplace + governance skills — not application source.
      ".claude/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "prisma/migrations/**",
      "playwright-report/**",
      "test-results/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Unused vars are real drift; allow the conventional `_`-prefixed intentional discards.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // tsc already forbids implicit any; explicit `any` is a pragmatic escape hatch used
      // deliberately in a few boundary spots, so warn rather than fail the build on it.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Config and Node tooling files run in a Node context.
    files: ["*.{js,mjs,cjs,ts}", "scripts/**", "prisma/**/*.ts", "*.config.{js,ts,mjs}"],
    languageOptions: { globals: { ...globals.node } },
  },
);
