/**
 * Library wrapper — routes Next.js's `cacheHandlers.default` to
 * `@leejpsd/nextjs-cache-handler/cache-components` (the plural-form handler
 * used by the `'use cache'` directive).
 *
 * Toggled via env: USE_LIBRARY_HANDLER=true falls through here; otherwise the
 * project's own `redis-handler.cjs` continues to be the active handler. This
 * lets us dogfood the library while keeping a one-env-var rollback.
 */

"use strict";

// Startup signal — proves at runtime that this wrapper module was actually
// resolved by Next.js, not silently ignored due to a tracing/path issue.
console.log(
  "[lib-cache-components] loaded — using @leejpsd/nextjs-cache-handler wrapper",
  {
    USE_LIBRARY_HANDLER: process.env.USE_LIBRARY_HANDLER,
    NEXT_PHASE: process.env.NEXT_PHASE,
  }
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = require("@leejpsd/nextjs-cache-handler/cache-components");

module.exports = lib.createCacheComponentsHandler({
  client: {
    type: "redis",
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  // Match the demo's existing key prefix so a soft handover doesn't strand
  // entries written by the previous handler.
  keyPrefix: "next-cache:",
  // Stays in lockstep with the demo's deployment id so old cache entries from
  // a prior deploy don't bleed into new requests (the static-chunk-404 fix).
  buildNamespace: () =>
    process.env.DEPLOYMENT_VERSION ||
    process.env.GIT_HASH ||
    "unversioned",
  abortTimeoutMs: 1500,
  fallback: process.env.CACHE_HANDLER_FALLBACK === "memory" ? "always" : "auto",
  staleWhileRevalidate: true,
});
