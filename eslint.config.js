import { Linter } from "eslint";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import typescriptEslintParser from "@typescript-eslint/parser";

/** @type {Linter.FlatConfig[]} */
const config = [
  {
    ignores: ["out", "dist", "**/*.d.ts"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptEslintParser, // Use the imported parser object
      parserOptions: {
        ecmaVersion: 6,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],
      semi: ["warn", "always"], // Use the core ESLint `semi` rule instead of `@typescript-eslint/semi`
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
    },
  },
];

export default config;
