import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL =
  __ENV.APP_BASE_URL ||
  "http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com";

const SSR_VUS = Number(__ENV.K6_SSR_VUS || "5");
const SSR_DURATION = __ENV.K6_SSR_DURATION || "45s";
const ISR_FETCH_VUS = Number(__ENV.K6_ISR_FETCH_VUS || "5");
const ISR_FETCH_DURATION = __ENV.K6_ISR_FETCH_DURATION || "45s";
const SHARED_CACHE_VUS = Number(__ENV.K6_SHARED_CACHE_VUS || "5");
const SHARED_CACHE_DURATION = __ENV.K6_SHARED_CACHE_DURATION || "45s";

export const options = {
  scenarios: {
    ssr_page: {
      executor: "constant-vus",
      exec: "ssrPage",
      vus: SSR_VUS,
      duration: SSR_DURATION,
    },
    isr_fetch_page: {
      executor: "constant-vus",
      exec: "isrFetchPage",
      vus: ISR_FETCH_VUS,
      duration: ISR_FETCH_DURATION,
    },
    shared_cache_page: {
      executor: "constant-vus",
      exec: "sharedCachePage",
      vus: SHARED_CACHE_VUS,
      duration: SHARED_CACHE_DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<2200"],
    "http_req_duration{route:ssr}": ["p(95)<1500"],
    "http_req_duration{route:isr-fetch}": ["p(95)<1200"],
    "http_req_duration{route:shared-cache}": ["p(95)<1000"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        scenarios: {
          ssr: { vus: SSR_VUS, duration: SSR_DURATION },
          isrFetch: { vus: ISR_FETCH_VUS, duration: ISR_FETCH_DURATION },
          sharedCache: {
            vus: SHARED_CACHE_VUS,
            duration: SHARED_CACHE_DURATION,
          },
        },
        notes: [
          "CSR는 hydrate 이후 브라우저 fetch까지 봐야 하므로 k6만으로는 완전한 비교가 어렵습니다.",
          "이번 baseline은 서버 전략인 SSR / ISR(fetch) / Cache Components + Redis를 비교합니다.",
        ],
      },
      null,
      2
    )
  );
}

function request(path, route) {
  const response = http.get(`${BASE_URL}${path}`, {
    tags: { route },
  });

  check(response, {
    [`${route} responded 200`]: (res) => res.status === 200,
  });

  sleep(Math.random() * 0.6 + 0.2);
}

export function ssrPage() {
  request("/experiments/ssr", "ssr");
}

export function isrFetchPage() {
  request("/experiments/isr-fetch", "isr-fetch");
}

export function sharedCachePage() {
  request("/experiments/shared-cache", "shared-cache");
}
