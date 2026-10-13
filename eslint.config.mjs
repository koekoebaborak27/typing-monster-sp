import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// ESLint の設定。Next.js の公式ルール（表示速度に関わる書き方の注意と TypeScript 用のルール）を土台にする。
/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextVitals,
  ...nextTs,
  // Prettier と競合する整形系ルールを無効化（format は Prettier に一任）
  prettier,
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      ".next/**",
      "next-env.d.ts",
      "playwright.config.ts",
      "e2e/**",
    ],
  },
];

export default config;
