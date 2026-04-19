#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const RUNS = Number(process.env.WEB_VITALS_RUNS || "5");
const OUTPUT_PATH =
  process.env.WEB_VITALS_OUT || "docs/load-test/2026-04-19/web-vitals.json";
const FORM_FACTOR = process.env.WEB_VITALS_FORM_FACTOR || "mobile"; // "mobile" | "desktop"

const ROUTES = [
  { key: "ssr", path: "/experiments/ssr" },
  { key: "isr-fetch", path: "/experiments/isr-fetch" },
  { key: "shared-cache", path: "/experiments/shared-cache" },
  { key: "hybrid", path: "/experiments/hybrid" },
  { key: "csr", path: "/experiments/csr" },
  { key: "bff", path: "/experiments/bff" },
];

const METRICS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "speed-index",
  "total-blocking-time",
  "cumulative-layout-shift",
  "interactive",
  "server-response-time",
];

function summarize(values) {
  if (values.length === 0) {
    return { count: 0, avg: null, min: null, med: null, p95: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const p95Index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
  );
  return {
    count: values.length,
    avg: Number((sum / values.length).toFixed(1)),
    min: Number(sorted[0].toFixed(1)),
    med: Number(sorted[Math.floor(sorted.length / 2)].toFixed(1)),
    p95: Number(sorted[p95Index].toFixed(1)),
    max: Number(sorted.at(-1).toFixed(1)),
  };
}

async function runOne(url, chromePort) {
  const result = await lighthouse(
    url,
    {
      port: chromePort,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance"],
      formFactor: FORM_FACTOR,
      screenEmulation:
        FORM_FACTOR === "mobile"
          ? {
              mobile: true,
              width: 360,
              height: 640,
              deviceScaleFactor: 2,
              disabled: false,
            }
          : {
              mobile: false,
              width: 1350,
              height: 940,
              deviceScaleFactor: 1,
              disabled: false,
            },
      throttling:
        FORM_FACTOR === "mobile"
          ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 4,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            }
          : {
              rttMs: 40,
              throughputKbps: 10240,
              cpuSlowdownMultiplier: 1,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            },
    },
    undefined
  );

  const audits = result.lhr.audits;
  const metrics = {};
  for (const id of METRICS) {
    metrics[id] = audits[id]?.numericValue ?? null;
  }
  metrics["performance-score"] = (result.lhr.categories.performance?.score ?? 0) * 100;
  return metrics;
}

async function main() {
  console.log(
    `Web Vitals (Lighthouse) against ${BASE_URL}, ${RUNS} runs × ${ROUTES.length} routes, form=${FORM_FACTOR}`
  );

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const perRoute = {};
    for (const route of ROUTES) {
      // Pre-check: skip routes returning non-200 to avoid polluting results.
      try {
        const preRes = await fetch(`${BASE_URL}${route.path}`, {
          headers: { "User-Agent": "pre-check" },
        });
        if (!preRes.ok) {
          console.log(
            `  ${route.key.padEnd(14)} SKIPPED (pre-check ${preRes.status})`
          );
          perRoute[route.key] = {
            path: route.path,
            skipped: true,
            preCheckStatus: preRes.status,
          };
          continue;
        }
      } catch (error) {
        console.log(
          `  ${route.key.padEnd(14)} SKIPPED (pre-check error: ${error.message})`
        );
        perRoute[route.key] = {
          path: route.path,
          skipped: true,
          preCheckError: error instanceof Error ? error.message : String(error),
        };
        continue;
      }

      const runs = [];
      for (let i = 1; i <= RUNS; i += 1) {
        try {
          const metrics = await runOne(`${BASE_URL}${route.path}`, chrome.port);
          runs.push(metrics);
          console.log(
            `  ${route.key.padEnd(14)} run ${i}/${RUNS} LCP=${Math.round(
              metrics["largest-contentful-paint"]
            )}ms FCP=${Math.round(metrics["first-contentful-paint"])}ms TBT=${Math.round(
              metrics["total-blocking-time"]
            )}ms CLS=${(metrics["cumulative-layout-shift"] ?? 0).toFixed(3)} score=${Math.round(
              metrics["performance-score"]
            )}`
          );
        } catch (error) {
          console.error(`  ${route.key} run ${i} failed: ${error.message}`);
        }
      }

      const summary = {};
      for (const metric of [...METRICS, "performance-score"]) {
        const values = runs
          .map((r) => r[metric])
          .filter((v) => typeof v === "number");
        summary[metric] = summarize(values);
      }

      perRoute[route.key] = {
        path: route.path,
        runs,
        summary,
      };
    }

    const out = {
      baseUrl: BASE_URL,
      formFactor: FORM_FACTOR,
      runsPerRoute: RUNS,
      measuredAt: new Date().toISOString(),
      routes: perRoute,
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`\nSaved: ${OUTPUT_PATH}`);
  } finally {
    await chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
