import babelParser from "@babel/eslint-parser";
import globals from "globals";

const coreRules = {
  "constructor-super": "error",
  "no-async-promise-executor": "error",
  "no-case-declarations": "error",
  "no-compare-neg-zero": "error",
  "no-cond-assign": "error",
  "no-constant-binary-expression": "error",
  "no-debugger": "error",
  "no-dupe-args": "error",
  "no-dupe-else-if": "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-fallthrough": "error",
  "no-self-assign": "error",
  "no-unsafe-finally": "error",
  "no-unsafe-negation": "error",
  "no-unsafe-optional-chaining": "error",
  "no-unreachable": "error",
  "no-useless-catch": "error",
  "no-var": "error",
  "prefer-const": "error",
  "valid-typeof": "error",
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
    ],
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    ignores: ["**/*.d.ts"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: {
            plugins: [["typescript", { isTSX: true }], "jsx"],
          },
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: coreRules,
  },
  {
    files: ["**/*.d.ts"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: {
            plugins: [["typescript", { dts: true }]],
          },
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: coreRules,
  },
];
