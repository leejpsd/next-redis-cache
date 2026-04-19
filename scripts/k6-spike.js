import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL =
  __ENV.APP_BASE_URL ||
  "http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com";

const PEAK_VUS = Number(__ENV.K6_SPIKE_PEAK_VUS || "50");
const RAMP_UP = __ENV.K6_SPIKE_RAMP_UP || "2m";
const HOLD = __ENV.K6_SPIKE_HOLD || "5m";
const RAMP_DOWN = __ENV.K6_SPIKE_RAMP_DOWN || "1m";

export const options = {
  scenarios: {
    ssr_spike: {
      executor: "ramping-vus",
      exec: "ssrPage",
      startVUs: 1,
      stages: [
        { duration: RAMP_UP, target: PEAK_VUS },
        { duration: HOLD, target: PEAK_VUS },
        { duration: RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: "30s",
    },
    isr_fetch_spike: {
      executor: "ramping-vus",
      exec: "isrFetchPage",
      startVUs: 1,
      stages: [
        { duration: RAMP_UP, target: PEAK_VUS },
        { duration: HOLD, target: PEAK_VUS },
        { duration: RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: "30s",
    },
    shared_cache_spike: {
      executor: "ramping-vus",
      exec: "sharedCachePage",
      startVUs: 1,
      stages: [
        { duration: RAMP_UP, target: PEAK_VUS },
        { duration: HOLD, target: PEAK_VUS },
        { duration: RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    "http_req_duration{route:ssr}": ["p(95)<5000"],
    "http_req_duration{route:isr-fetch}": ["p(95)<2000"],
    "http_req_duration{route:shared-cache}": ["p(95)<2000"],
    checks: ["rate>0.95"],
  },
};

export function setup() {
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        profile: "spike",
        peakVus: PEAK_VUS,
        ramp: { rampUp: RAMP_UP, hold: HOLD, rampDown: RAMP_DOWN },
        notes: [
          "각 시나리오가 동시에 실행되므로 스테이지별 실제 동시 VU는 3 * 스테이지 VU.",
          "peakVus=50이면 피크 동시 VU는 최대 150.",
        ],
      },
      null,
      2
    )
  );
}

function request(path, route) {
  const response = http.get(`${BASE_URL}${path}`, { tags: { route } });
  check(response, {
    [`${route} responded 200`]: (res) => res.status === 200,
  });
  sleep(Math.random() * 0.4 + 0.1);
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
