#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const OUTPUT_PATH =
  process.env.SEO_OUT || "docs/load-test/2026-04-19/seo-html.json";

const ROUTES = [
  { key: "ssr", path: "/experiments/ssr" },
  { key: "isr-fetch", path: "/experiments/isr-fetch" },
  { key: "shared-cache", path: "/experiments/shared-cache" },
  { key: "hybrid", path: "/experiments/hybrid" },
  { key: "csr", path: "/experiments/csr" },
  { key: "bff", path: "/experiments/bff" },
];

const USER_AGENTS = [
  {
    label: "browser",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  },
  {
    label: "googlebot",
    ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    label: "naked-curl",
    ua: "curl/8.0",
  },
];

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectPayload(html) {
  const text = stripTags(html);
  return {
    textLength: text.length,
    hasNameLike: /[A-Z][a-z]+ [A-Z][a-z]+/.test(text),
    hasPlaceholder: /로딩|loading|가져오는|준비/i.test(text),
    hasCSRLoadingMarker: /브라우저에서 데이터를 가져오는 중입니다/.test(text),
    sample: text.slice(0, 200),
  };
}

async function measureOnce(route, ua) {
  const started = performance.now();
  const res = await fetch(`${BASE_URL}${route.path}`, {
    headers: {
      "User-Agent": ua,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await res.text();
  const elapsedMs = performance.now() - started;

  return {
    status: res.status,
    bytes: html.length,
    elapsedMs: Number(elapsedMs.toFixed(1)),
    headers: {
      "content-type": res.headers.get("content-type"),
      "cache-control": res.headers.get("cache-control"),
      "x-cache": res.headers.get("x-cache"),
    },
    payload: detectPayload(html),
  };
}

async function main() {
  console.log(`SEO HTML measurement against ${BASE_URL}`);
  const results = [];

  for (const route of ROUTES) {
    for (const agent of USER_AGENTS) {
      try {
        const measurement = await measureOnce(route, agent.ua);
        results.push({
          route: route.key,
          path: route.path,
          agent: agent.label,
          ...measurement,
        });
        console.log(
          `  ${route.key.padEnd(14)} ${agent.label.padEnd(11)} ` +
            `status=${measurement.status} ` +
            `bytes=${measurement.bytes.toString().padStart(6)} ` +
            `textLen=${measurement.payload.textLength.toString().padStart(5)} ` +
            `nameLike=${measurement.payload.hasNameLike ? "Y" : "n"} ` +
            `csrLoading=${measurement.payload.hasCSRLoadingMarker ? "Y" : "n"}`
        );
      } catch (error) {
        console.error(`  ${route.key} / ${agent.label}: ${error.message}`);
        results.push({
          route: route.key,
          path: route.path,
          agent: agent.label,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const out = {
    baseUrl: BASE_URL,
    measuredAt: new Date().toISOString(),
    results,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nSaved: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
