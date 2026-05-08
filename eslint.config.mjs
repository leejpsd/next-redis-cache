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
    "coverage/**",
    "next-env.d.ts",
    // CommonJS shim modules that wire Next.js's cacheHandler/cacheHandlers
    // options. Next.js calls these via require.resolve() at request time,
    // and CJS require() is the right tool — type-aware lint rules don't fit.
    "redis-handler.cjs",
    "cache-components-router.cjs",
    "incremental-router.cjs",
    "lib-cache-components.cjs",
    "lib-incremental-cache-handler.cjs",
  ]),
]);

export default eslintConfig;
