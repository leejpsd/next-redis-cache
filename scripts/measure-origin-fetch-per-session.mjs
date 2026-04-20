#!/usr/bin/env node
/**
 * CSR/BFF/ISR 세션당 실제 origin API 호출 수 실측.
 *
 * 측정 개념:
 *  - 각 전략 페이지에 fresh browser context로 N번 방문
 *  - 각 세션에서 randomuser.me/api 로 나가는 요청을 카운트
 *  - CSR: 브라우저가 직접 origin 호출 → 세션당 1+회 기대
 *  - BFF: 브라우저 → /api/bff → 서버가 origin (브라우저 trace에는 origin 안 찍힘)
 *  - SSR/ISR/shared-cache/Hybrid: 브라우저가 origin 호출 안 함 (서버가 프록시)
 *
 * 목적:
 *  - OriginFetchChart의 "가정치" 부분을 실측 근거로 바꾼다
 *  - "CSR이 사용자 수만큼 origin을 때린다"를 숫자로 증명
 *
 * 실행:
 *  APP_BASE_URL=http://localhost:3000 \
 *  SESSION_COUNT=10 \
 *  node scripts/measure-origin-fetch-per-session.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const SESSION_COUNT = Number(process.env.SESSION_COUNT || "10");
const OUTPUT_PATH =
  process.env.OUT || "docs/load-test/2026-04-20/origin-fetch-per-session.json";

const ORIGIN_URL_PATTERN = /randomuser\.me\/api/;

const ROUTES = [
  { key: "csr", path: "/experiments/csr" },
  { key: "bff", path: "/experiments/bff" },
  { key: "ssr", path: "/experiments/ssr" },
  { key: "isr-fetch", path: "/experiments/isr-fetch" },
  { key: "shared-cache", path: "/experiments/shared-cache" },
  { key: "hybrid", path: "/experiments/hybrid" },
];

/**
 * 한 세션 = fresh browser context + 페이지 로드 + hydration 후 fetch 기다리기.
 * CSR은 JS 실행 → fetch 과정이라 최대 10초까지 관찰.
 */
async function measureSession(browser, route) {
  const context = await browser.newContext({
    bypassCSP: true,
  });
  const page = await context.newPage();

  const originRequests = [];
  page.on("request", (req) => {
    if (ORIGIN_URL_PATTERN.test(req.url())) {
      originRequests.push({
        url: req.url(),
        resourceType: req.resourceType(),
        method: req.method(),
      });
    }
  });

  try {
    await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
  } catch (err) {
    console.warn(`    (${route.key}) goto timeout: ${err.message}`);
  }

  // CSR/BFF의 경우 데이터가 DOM에 반영될 때까지 대기.
  // 서버 렌더 전략(SSR/ISR/shared-cache/hybrid)은 이 셀렉터가 없으므로 타임아웃 후 즉시 종료.
  try {
    await page.waitForFunction(
      () =>
        Boolean(
          document.querySelector("#client-fetch-metrics") ||
            document.querySelector("p.text-rose-700")
        ),
      { timeout: 8000 }
    );
  } catch {
    // 서버 렌더 전략이거나 CSR 실패 — 아무튼 진행
  }

  // request 이벤트 큐가 flush될 시간
  await page.waitForTimeout(800);

  await context.close();
  return originRequests;
}

function summarize(counts) {
  if (counts.length === 0) return { avg: 0, min: 0, max: 0, sum: 0 };
  const sorted = [...counts].sort((a, b) => a - b);
  return {
    avg: Number((counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2)),
    min: sorted[0],
    max: sorted.at(-1),
    sum: counts.reduce((a, b) => a + b, 0),
  };
}

async function main() {
  console.log(
    `Origin fetch per session — ${BASE_URL}, ${SESSION_COUNT} sessions × ${ROUTES.length} routes`
  );
  const browser = await chromium.launch({ headless: true });

  try {
    const results = {};
    for (const route of ROUTES) {
      console.log(`\n  ${route.key} (${route.path})`);
      const counts = [];
      const allRequests = [];

      for (let i = 1; i <= SESSION_COUNT; i += 1) {
        const reqs = await measureSession(browser, route);
        counts.push(reqs.length);
        allRequests.push(...reqs);
        process.stdout.write(
          `    session ${i}/${SESSION_COUNT}: ${reqs.length} origin calls\n`
        );
      }

      const stats = summarize(counts);
      results[route.key] = {
        path: route.path,
        sessions: SESSION_COUNT,
        originFetchCounts: counts,
        stats,
        monthlyExtrapolation: {
          note: "월 100만 세션 × 세션당 평균 origin 호출 수",
          perSessionAvg: stats.avg,
          monthly1M: Math.round(stats.avg * 1_000_000),
        },
        sampleRequests: allRequests.slice(0, 3),
      };

      console.log(
        `    → avg ${stats.avg}, min ${stats.min}, max ${stats.max}, ` +
          `월 100만 세션 환산 ${results[route.key].monthlyExtrapolation.monthly1M.toLocaleString()} 회`
      );
    }

    const out = {
      baseUrl: BASE_URL,
      sessionsPerRoute: SESSION_COUNT,
      measuredAt: new Date().toISOString(),
      description:
        "각 전략 페이지에 fresh browser context로 접속했을 때 브라우저가 randomuser.me/api 를 직접 호출한 횟수. " +
          "CSR은 사용자 수만큼 직접 호출, 서버 렌더 전략은 서버가 프록시하므로 브라우저에선 0회가 기대됨.",
      results,
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`\nSaved: ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
