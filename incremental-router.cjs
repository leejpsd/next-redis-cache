/**
 * Runtime router for Next.js's singular `cacheHandler` (ISR / Pages Router).
 * See cache-components-router.cjs for rationale.
 */
"use strict";

const useLibrary = process.env.USE_LIBRARY_HANDLER === "true";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = useLibrary
  ? require("./lib-incremental-cache-handler.cjs")
  : require("./incremental-cache-handler.js");

module.exports = handler;
