import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL =
  __ENV.APP_BASE_URL ||
  "http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com";

const HOME_VUS = Number(__ENV.K6_HOME_VUS || "5");
const HOME_DURATION = __ENV.K6_HOME_DURATION || "45s";
const USE_CACHE_VUS = Number(__ENV.K6_USE_CACHE_VUS || "5");
const USE_CACHE_DURATION = __ENV.K6_USE_CACHE_DURATION || "45s";

export const options = {
  scenarios: {
    home_page: {
      executor: "constant-vus",
      exec: "homePage",
      vus: HOME_VUS,
      duration: HOME_DURATION,
    },
    use_cache_page: {
      executor: "constant-vus",
      exec: "useCachePage",
      vus: USE_CACHE_VUS,
      duration: USE_CACHE_DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200", "p(99)<2000"],
    "http_req_duration{route:home}": ["p(95)<1500"],
    "http_req_duration{route:use-cache}": ["p(95)<1200"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        scenarios: {
          home: { vus: HOME_VUS, duration: HOME_DURATION },
          useCache: { vus: USE_CACHE_VUS, duration: USE_CACHE_DURATION },
        },
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

export function homePage() {
  request("/", "home");
}

export function useCachePage() {
  request("/verify/use-cache", "use-cache");
}
