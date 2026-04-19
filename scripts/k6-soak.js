import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL =
  __ENV.APP_BASE_URL ||
  "http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com";

const VUS = Number(__ENV.K6_SOAK_VUS || "10");
const DURATION = __ENV.K6_SOAK_DURATION || "30m";

export const options = {
  scenarios: {
    shared_cache_soak: {
      executor: "constant-vus",
      exec: "sharedCachePage",
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{route:shared-cache}": ["p(95)<800"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        profile: "soak",
        vus: VUS,
        duration: DURATION,
        target: "shared-cache (use cache + Redis)",
      },
      null,
      2
    )
  );
}

export function sharedCachePage() {
  const response = http.get(`${BASE_URL}/experiments/shared-cache`, {
    tags: { route: "shared-cache" },
  });
  check(response, {
    "shared-cache responded 200": (res) => res.status === 200,
  });
  sleep(Math.random() * 0.8 + 0.4);
}
