import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL =
  process.env.APP_BASE_URL ||
  "http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com";
const ITERATIONS = Number(process.env.BROWSER_MEASURE_ITERATIONS || "7");
const OUTPUT_PATH =
  process.env.BROWSER_MEASURE_OUT || "docs/load-test/browser-strategies.json";

const ROUTES = [
  {
    key: "csr",
    path: "/experiments/csr",
  },
  {
    key: "bff",
    path: "/experiments/bff",
  },
];

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return null;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
  );
  return sortedValues[index];
}

function summarize(values) {
  if (values.length === 0) {
    return {
      count: 0,
      avg: null,
      min: null,
      med: null,
      p95: null,
      max: null,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, value) => acc + value, 0);

  return {
    count: values.length,
    avg: Number((sum / values.length).toFixed(1)),
    min: Number(sorted[0].toFixed(1)),
    med: Number(percentile(sorted, 0.5).toFixed(1)),
    p95: Number(percentile(sorted, 0.95).toFixed(1)),
    max: Number(sorted.at(-1).toFixed(1)),
  };
}

async function measureRoute(browser, route) {
  const samples = [];

  for (let iteration = 1; iteration <= ITERATIONS; iteration += 1) {
    const page = await browser.newPage();
    const startedAt = performance.now();

    try {
      await page.goto(new URL(route.path, BASE_URL).toString(), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector("#client-fetch-metrics");

      const metricsText = await page.locator("#client-fetch-metrics").textContent();
      const payloadText = await page
        .locator("#experiment-random-user-payload")
        .textContent();

      const endedAt = performance.now();
      const metrics = JSON.parse(metricsText ?? "{}");
      const payload = JSON.parse(payloadText ?? "{}");

      samples.push({
        iteration,
        pageReadyMs: Number((endedAt - startedAt).toFixed(1)),
        browserFetchMs: Number(metrics.fetchDurationMs?.toFixed?.(1) ?? metrics.fetchDurationMs),
        readyToPaintMs: Number(
          metrics.readyDurationMs?.toFixed?.(1) ?? metrics.readyDurationMs
        ),
        bffServerMs:
          metrics.bffDurationMs == null
            ? null
            : Number(metrics.bffDurationMs.toFixed(1)),
        generatedBy: payload.generatedBy?.instanceId ?? "unknown",
      });
    } finally {
      await page.close();
    }
  }

  return samples;
}

function summarizeRouteSamples(samples) {
  return {
    pageReadyMs: summarize(samples.map((sample) => sample.pageReadyMs)),
    browserFetchMs: summarize(samples.map((sample) => sample.browserFetchMs)),
    readyToPaintMs: summarize(samples.map((sample) => sample.readyToPaintMs)),
    bffServerMs: summarize(
      samples
        .map((sample) => sample.bffServerMs)
        .filter((value) => typeof value === "number")
    ),
    generatedByInstances: [...new Set(samples.map((sample) => sample.generatedBy))],
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const routeResults = {};

    for (const route of ROUTES) {
      const samples = await measureRoute(browser, route);
      routeResults[route.key] = {
        path: route.path,
        samples,
        summary: summarizeRouteSamples(samples),
      };
    }

    const result = {
      baseUrl: BASE_URL,
      iterations: ITERATIONS,
      measuredAt: new Date().toISOString(),
      routes: routeResults,
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));

    console.log(JSON.stringify(result, null, 2));
    console.log("");
    console.log(`Browser strategy summary: ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  console.error("");
  console.error(
    "If Playwright browsers are not installed, run: npx playwright install chromium"
  );
  process.exit(1);
});
