import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.config.*",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // TypeScript's type checker handles undefined identifiers; the core rule
      // produces false positives on ambient globals (process, document, ...).
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Engine purity is non-negotiable (HANDOFF.md §4, §14.1): the engine must stay
    // isomorphic and free of React, the DOM, Node, and Supabase.
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "engine must stay pure — no React." },
            { name: "react-dom", message: "engine must stay pure — no React." },
          ],
          patterns: [
            { group: ["react", "react/*", "react-dom/*"], message: "engine must stay pure — no React." },
            { group: ["next", "next/*"], message: "engine must stay framework-free — no Next." },
            { group: ["@supabase/*"], message: "engine must stay backend-free — no Supabase." },
            { group: ["node:*"], message: "engine must stay isomorphic — no Node built-ins." },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "engine must stay DOM-free." },
        { name: "document", message: "engine must stay DOM-free." },
        { name: "navigator", message: "engine must stay DOM-free." },
        { name: "localStorage", message: "engine must stay DOM-free." },
        { name: "process", message: "engine must stay isomorphic — no Node globals." },
        { name: "Buffer", message: "engine must stay isomorphic — no Node globals." },
        { name: "__dirname", message: "engine must stay isomorphic — no Node globals." },
        { name: "__filename", message: "engine must stay isomorphic — no Node globals." },
        { name: "global", message: "engine must stay isomorphic — use globalThis." },
      ],
    },
  },
);
