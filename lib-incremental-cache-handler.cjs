/**
 * Library wrapper — routes Next.js's singular `cacheHandler` (Pages Router
 * ISR + on-demand revalidation + APP_PAGE/APP_ROUTE/FETCH/IMAGE kinds) to
 * `@leejpsd/nextjs-cache-handler/incremental`.
 *
 * Toggled via env: USE_LIBRARY_HANDLER=true falls through here; otherwise
 * the project's own `incremental-cache-handler.js` continues to be active.
 */

"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = require("@leejpsd/nextjs-cache-handler/incremental");

module.exports = lib.createIncrementalCacheHandler({
  client: {
    type: "redis",
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  keyPrefix: "next-incremental:",
  buildNamespace: () =>
    process.env.DEPLOYMENT_VERSION ||
    process.env.GIT_HASH ||
    "unversioned",
  abortTimeoutMs: 1500,
  fallback: process.env.CACHE_HANDLER_FALLBACK === "memory" ? "always" : "auto",
});
