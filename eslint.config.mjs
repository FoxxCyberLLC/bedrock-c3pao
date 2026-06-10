import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated coverage output and isolated /spec worktrees are not source.
    "coverage/**",
    ".worktrees/**",
  ]),
  // start.js is the CommonJS standalone bootstrap (run as `node start.js` from
  // the Next.js standalone build); require()/module.exports are correct there.
  {
    files: ["start.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Vendored Shadcn/UI primitives ship with @ts-nocheck and React Compiler
  // patterns the generator owns — don't fight lint on files we don't author.
  {
    files: ["components/ui/**"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
