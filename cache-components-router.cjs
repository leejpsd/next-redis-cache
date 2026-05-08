/**
 * Runtime router for Next.js's `cacheHandlers.default`.
 *
 * Why this exists: `next.config.ts#cacheHandlers` is evaluated at build time,
 * so any env-var-based toggle there picks the path *once* and bakes the
 * `require.resolve(...)` result into the standalone server. The runtime
 * `USE_LIBRARY_HANDLER` env never gets a chance to flip the choice.
 *
 * This module is loaded at request-handling time. It reads the env var
 * here, where it actually exists, and returns whichever handler module
 * the env says to use.
 */
"use strict";

const useLibrary = process.env.USE_LIBRARY_HANDLER === "true";

console.log("[cache-components-router] active backend:", useLibrary ? "library" : "in-tree", {
  USE_LIBRARY_HANDLER: process.env.USE_LIBRARY_HANDLER,
  NEXT_PHASE: process.env.NEXT_PHASE,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = useLibrary
  ? require("./lib-cache-components.cjs")
  : require("./redis-handler.cjs");

module.exports = handler;
