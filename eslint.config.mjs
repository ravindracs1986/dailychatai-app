import nextPlugin from "@next/eslint-plugin-next"
import tsParser from "@typescript-eslint/parser"
import reactHooksPlugin from "eslint-plugin-react-hooks"

const nextRecommended = nextPlugin.configs?.recommended?.rules ?? {}
const nextCoreWebVitals = nextPlugin.configs?.["core-web-vitals"]?.rules ?? {}

export default [
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "build/**"],
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextRecommended,
      ...nextCoreWebVitals,
    },
  },
]
