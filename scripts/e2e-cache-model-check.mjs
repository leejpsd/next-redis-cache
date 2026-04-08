import { spawn } from "node:child_process";
import http from "node:http";
import { once } from "node:events";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startProbeServer() {
  const counts = new Map();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname !== "/probe") {
      res.writeHead(404).end("not found");
      return;
    }

    const mode = url.searchParams.get("mode") || "default";
    const nextCount = (counts.get(mode) || 0) + 1;
    counts.set(mode, nextCount);

    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(
      JSON.stringify({
        mode,
        count: nextCount,
        servedAt: Date.now(),
      })
    );
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        counts,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function waitForHttpOk(url, timeoutMs = 15000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}

    await wait(250);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function runCommand(cmd, args, env) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env,
  });

  const [code] = await once(child, "exit");
  if (code !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with code ${code}`);
  }
}

function extractPayload(html) {
  const match = html.match(
    /<pre id="probe-payload"[\s\S]*?>([\s\S]*?)<\/pre>/
  );
  if (!match) {
    throw new Error("Probe payload not found in HTML");
  }

  const decoded = match[1]
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

  return JSON.parse(decoded);
}

async function readPayload(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl));
  if (!response.ok) {
    throw new Error(`Request failed for ${pathname}: ${response.status}`);
  }

  const html = await response.text();
  return extractPayload(html);
}

async function main() {
  const appBaseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3200";
  const appUrl = new URL(appBaseUrl);
  const port = appUrl.port || "3200";

  const probe = await startProbeServer();

  const env = {
    ...process.env,
    APP_BASE_URL: appBaseUrl,
    CACHE_PROBE_SOURCE_URL: probe.url,
    DISABLE_REDIS_CACHE_HANDLER: "true",
  };

  await runCommand("node_modules/.bin/next", ["build"], env);

  const server = spawn(
    "node_modules/.bin/next",
    ["start", "-p", port],
    {
      stdio: "inherit",
      env,
    }
  );

  try {
    await waitForHttpOk(new URL("/verify/use-cache", appBaseUrl));

    const fetchFirst = await readPayload(
      appBaseUrl,
      "/verify/fetch-revalidate-only"
    );
    const fetchSecond = await readPayload(
      appBaseUrl,
      "/verify/fetch-revalidate-only"
    );

    const useCacheFirst = await readPayload(appBaseUrl, "/verify/use-cache");
    const useCacheSecond = await readPayload(appBaseUrl, "/verify/use-cache");

    const result = {
      ok: true,
      fetchRevalidateOnly: {
        first: fetchFirst,
        second: fetchSecond,
        cached: fetchFirst.count === fetchSecond.count,
      },
      useCache: {
        first: useCacheFirst,
        second: useCacheSecond,
        cached: useCacheFirst.count === useCacheSecond.count,
      },
    };

    console.log(JSON.stringify(result, null, 2));

    assert(result.useCache.cached === true, "Expected use-cache route to cache");
  } finally {
    server.kill("SIGTERM");
    await once(server, "exit").catch(() => undefined);
    await new Promise((resolve) => probe.server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
