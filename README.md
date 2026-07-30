# Next.js 16 + Redis Shared Cache Lab

> **"CSR이 서버비 아끼고 유저한테 넘기면 되지 않나"**
> — 반만 맞는 이야기다. 이 저장소는 그 주장을 실측으로 반박한다.

Next.js 16 + AWS ECS Fargate 멀티 태스크 환경에서 `no-store` / ISR / Cache Components / Hybrid / CSR / BFF 여섯 전략을 같은 인프라에서 비교한 포트폴리오. 모든 수치는 측정 시나리오·계측 코드와 함께 저장소에 기록되어 있습니다. 라이브 인프라(월 $98)는 검증 완료 후 종료했으며, `infra/`·`ops/`로 동일 환경을 재현할 수 있습니다.

![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![Redis](https://img.shields.io/badge/Redis-5.x-DC382D?logo=redis)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![k6](https://img.shields.io/badge/k6-1.7.1-7D64FF)
![Lighthouse](https://img.shields.io/badge/Lighthouse-12-F44B21)

## 한눈에 보기

| 구분 | 링크 |
| --- | --- |
| **Live 인프라** | 검증 완료 후 종료(2026-07) — `infra/`·`ops/`로 재현 가능 |
| **3편 블로그 (운영 검증)** | https://www.eddy-dev.xyz/blog/next-js-16-redis-aws-self-hosting-%EC%BA%90%EC%8B%9C-%EB%B6%88%EC%9D%BC%EC%B9%98-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0-3%ED%8E%B8-%EC%9A%B4%EC%98%81-%EA%B2%80%EC%A6%9D |
| **4편 블로그 (실측과 최선의 선택)** | https://www.eddy-dev.xyz/blog/next-js-16-redis-aws-self-hosting-%EC%BA%90%EC%8B%9C-%EB%B6%88%EC%9D%BC%EC%B9%98-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0-4%ED%8E%B8-%EB%A0%8C%EB%8D%94%EB%A7%81-%EC%A0%84%EB%9E%B5-%EC%8B%A4%EC%B8%A1%EA%B3%BC-%EC%B5%9C%EC%84%A0%EC%9D%98-%EC%84%A0%ED%83%9D |

## 이 프로젝트가 증명하는 것

**공개 페이지 본문에 CSR을 쓰면 안 되는 이유를 수치 4개로 정리**하고, 그 대신 화면마다 무엇을 골라야 하는지 실측으로 답합니다.

1. **공유 캐시는 실제로 스파이크에서 원본을 막는다** — 20,377 요청이 몰려도 Redis `entryKeys`는 1개로 고정 (Soak 30분 에러율 0.00%)
2. **무효화는 두 태스크에 6.4ms 안에 동시 반영** — A/B 편차 0ms. 1편에서 지적한 "EC2 #1 최신 / #2 옛날" 문제가 실질 해결됨
3. **CSR은 세션당 origin 호출 정확히 1.0회** — 분산 0. 사용자 N명 = origin 호출 N회가 구조적으로 확정
4. **Hybrid(Streaming SSR + 섹션별 Cache Components)가 메인 페이지의 현실적 답** — LCP 1,743ms로 ISR과 동률이면서 섹션별 독립 무효화

## 최종 측정 결과 요약 (2026-04-19 ~ 04-20)

`ap-southeast-2` · ECS Fargate 2 task × 0.5 vCPU × 1 GB · ElastiCache `cache.t4g.micro` · ALB.

### 서버 성능 (k6)

| 전략 | 평상시 p95 | 스파이크 p95 | Soak 30min p95 |
| --- | --- | --- | --- |
| SSR (`no-store`) | 855ms | 1.95s | — |
| ISR (fetch revalidate) | **324ms** | **1.04s** | — |
| Cache Components + Redis | 354ms | 1.79s | **217ms** (에러 0.00%) |

### 사용자 체감 LCP (Lighthouse 모바일 4G)

| 전략 | LCP avg | Slow 3G |
| --- | --- | --- |
| **ISR / Hybrid** | **1743~1746ms** | 5,693ms |
| SSR / Cache Components | 1900~1904ms | 6,093~6,119ms |
| BFF | 1987ms | 6,275ms |
| **CSR** | **3200ms (+83%)** | **8,398ms** |

### SEO (초기 HTML 본문 길이)

| 전략 | Browser | Googlebot |
| --- | --- | --- |
| SSR / ISR / Cache Components | 3,200+ chars | 3,200+ chars |
| Hybrid | 751 (shell + fallback) | 685 |
| **CSR / BFF** | **143~165 (로딩 메시지)** | **80~93** |

### 실측 2건 (2026-04-20 추가)

| 측정 | CSR | 나머지 5종 |
| --- | --- | --- |
| **세션당 origin API 호출** | **1.0회** (min=max=1, 분산 0) | **0회** |
| 월 100만 세션 환산 | **1,000,000회** | 0 |

| revalidateTag 전파 | Task A (3000) | Task B (3001) |
| --- | --- | --- |
| avg | **6.4ms** | **6.4ms** |
| A/B 편차 | — | **0ms** |

### 월 인프라 비용 (ap-southeast-2, 온디맨드)

| 항목 | USD |
| --- | --- |
| ECS Fargate (2 task × 0.5 vCPU × 1 GB) | $44.98 |
| ALB (시간 + LCU) | $25.55 |
| ElastiCache Redis `cache.t4g.micro` | $16.06 |
| CloudWatch + Data Transfer | ~$11.72 |
| **합계** | **$98.31/월** |

`cache.t4g.micro`($16.06)는 태스크 1개 절감($22.49)만으로 회수됩니다.

## 실험 경로 6종

| 경로 | 전략 | 설명 |
| --- | --- | --- |
| [`/`]((라이브 인프라 종료)) | Live/Before/After 3장 카드 | 멀티 인스턴스 캐시 일관성 before/after 데모 |
| [`/dashboard`]((라이브 인프라 종료)) | 실측 결과 대시보드 | Act 1~5 스토리라인 + 아키텍처 SVG + Sticky TOC |
| [`/experiments/ssr`]((라이브 인프라 종료)/ssr) | SSR (`no-store`) | 요청마다 원본 호출 |
| [`/experiments/isr-fetch`]((라이브 인프라 종료)/isr-fetch) | ISR (fetch revalidate 60s) | 공유 캐시 기본값 |
| [`/experiments/shared-cache`]((라이브 인프라 종료)/shared-cache) | Cache Components + Redis | `use cache` + `cacheLife` + `cacheTag` |
| [`/experiments/hybrid`]((라이브 인프라 종료)/hybrid) | **Hybrid** | Streaming SSR + 섹션별 Cache Components |
| [`/experiments/csr`]((라이브 인프라 종료)/csr) | CSR | 브라우저 직접 fetch |
| [`/experiments/bff`]((라이브 인프라 종료)/bff) | BFF | `/api/bff/*` 경유 |

SSG는 비교에서 뺐습니다 — 이 시리즈가 푸는 "동적 데이터 멀티 인스턴스 일관성" 문제와 교집합이 없어서. 자세한 이유: [`docs/experiments/ssg-why-not-here.md`](./docs/experiments/ssg-why-not-here.md).

## 아키텍처

```text
            [사용자 · Googlebot]
                   |
               [ ALB ]
          /------------+------------\
  [ECS Task A]                [ECS Task B]
  Next.js 16 port 3000        Next.js 16 port 3000
  0.5 vCPU · 1 GB             0.5 vCPU · 1 GB
          \------------+------------/
                    (공유)
           [ ElastiCache Redis ]
           next-cache:entry:*
           next-cache:tag:*
           cache.t4g.micro · single-AZ
                       |
         (TTL 주기당 1회 · 또는 revalidateTag 시)
                       v
              [Origin API · randomuser.me]
```

두 ECS 태스크가 같은 ElastiCache Redis를 공유합니다. `revalidateTag` 호출 시 양쪽 태스크가 **6.4ms 안에 동시에** 새 값을 반환합니다 (A/B 편차 0ms).

대시보드에서는 같은 구성을 SVG로 시각화하고 CSR 경로(빨간 점선) vs 공유 캐시 경로(초록 점선) 차이도 표시합니다.

## 시리즈 블로그

| 편 | 주제 | 위치 |
| --- | --- | --- |
| 1편 | 멀티 인스턴스 캐시 불일치 개념 | [eddy-dev.xyz](https://www.eddy-dev.xyz/blog/Next.js-16-Redis-AWS-Self-hosting-%EC%BA%90%EC%8B%9C-%EB%B6%88%EC%9D%BC%EC%B9%98-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0-1%ED%8E%B8-%EA%B0%9C%EB%85%90) |
| 2편 | Docker Redis 로컬 재현 | [eddy-dev.xyz](https://www.eddy-dev.xyz/blog/Next.js-16-Redis-AWS-Self-hosting-%EC%BA%90%EC%8B%9C-%EB%B6%88%EC%9D%BC%EC%B9%98-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0-2%ED%8E%B8-%EA%B5%AC%ED%98%84) |
| 3편 | AWS Self-hosting 운영 검증 | [eddy-dev.xyz](https://www.eddy-dev.xyz/blog/next-js-16-redis-aws-self-hosting-%EC%BA%90%EC%8B%9C-%EB%B6%88%EC%9D%BC%EC%B9%98-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0-3%ED%8E%B8-%EC%9A%B4%EC%98%81-%EA%B2%80%EC%A6%9D) · [`md`](./docs/blog/next16-redis-rendering-strategies-part-3.md) |
| 4편 | 렌더링 전략 실측과 최선의 선택 | [eddy-dev.xyz](https://www.eddy-dev.xyz/blog/next-js-16-redis-aws-self-hosting-%EC%BA%90%EC%8B%9C-%EB%B6%88%EC%9D%BC%EC%B9%98-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0-4%ED%8E%B8-%EB%A0%8C%EB%8D%94%EB%A7%81-%EC%A0%84%EB%9E%B5-%EC%8B%A4%EC%B8%A1%EA%B3%BC-%EC%B5%9C%EC%84%A0%EC%9D%98-%EC%84%A0%ED%83%9D) · [`md`](./docs/blog/next16-redis-rendering-strategies-part-4.md) |

4편 대시보드 스토리라인 (Hero → Act 1~5 → Appendix → CTA):

- **Act 1** — 서버 시간만 보면 CSR이 이긴 것 같다 (오답 유도)
- **Act 2** — 사용자 체감 / SEO / Origin API 3단 반전
- **Act 3** — 공유 캐시 효과: 20K 요청에 Redis 1개 · 전파 6.4ms
- **Climax** — "전략은 하나가 아니다. 화면마다 다르다."
- **Act 4** — 화면별 최선의 선택 5카드
- **Act 5** — 운영 중 실제 겪은 사고 2건 (Resolved)

## 캐시 계층 설계 (중요)

Next.js 16에는 **두 개의 다른 캐시 핸들러 설정**이 있고, 이 프로젝트는 둘 다 Redis로 보냅니다.

| 설정 | 대상 | 이 프로젝트에서 |
| --- | --- | --- |
| `cacheHandler` (singular) | ISR / route handler 응답 / optimized images | [`incremental-cache-handler.js`](./incremental-cache-handler.js) — Redis |
| `cacheHandlers.default` (plural) | `use cache` / Cache Components | [`redis-handler.cjs`](./redis-handler.cjs) — Redis |

**빌드 간 엔트리 격리**: `incremental-cache-handler.js`의 엔트리 키는 `DEPLOYMENT_VERSION`(git SHA) 네임스페이스로 분리되어, 배포 간에도 옛 HTML이 갇히지 않습니다. 태그 메타 키는 배포 경계를 넘어 공유(= `revalidateTag`는 배포 간에도 작동).

자세한 이유: [`docs/incident/static-chunk-404-turbopack-mismatch.md`](./docs/incident/static-chunk-404-turbopack-mismatch.md) (Resolved 2026-04-20).

## 운영 사고 (Resolved)

포트폴리오 검증 중 staging에서 발견·해결한 사고 2건을 원인·수정·배포 검증까지 기록했습니다.

1. **배포 경계 캐시 누수** ([docs/incident/static-chunk-404-turbopack-mismatch.md](./docs/incident/static-chunk-404-turbopack-mismatch.md))
   - 증상: 새 배포 후에도 옛 Turbopack 청크(`*.wizo.js`) 404
   - 원인: Redis 엔트리 키에 buildId 네임스페이스 없음
   - 수정: `BUILD_NAMESPACE`(git SHA) prefix 추가, 태그 키는 공유 유지

2. **Health endpoint 오판** ([docs/incident/health-endpoint-redis-ping-mismatch.md](./docs/incident/health-endpoint-redis-ping-mismatch.md))
   - 증상: Redis 정상인데 `/api/health` 503, latencyMs=-1
   - 원인: `await import("@/redis-handler")` 동적 import 실패
   - 수정: `lib/redis-client.ts`에 `pingRedis()` static export, 1.5s 타임아웃

## 재현하기 — 3가지 명령

대시보드의 모든 수치를 직접 재현할 수 있습니다.

### 1. 서버 응답 시간 (k6)

```bash
APP_BASE_URL=http://<your-alb>/ npm run test:load:baseline
APP_BASE_URL=http://<your-alb>/ k6 run scripts/k6-spike.js
APP_BASE_URL=http://<your-alb>/ k6 run scripts/k6-soak.js
```

### 2. 사용자 체감 (Lighthouse)

```bash
# 로컬 prod build 필요
REDIS_URL=redis://localhost:6379 npm run build && \
  REDIS_URL=redis://localhost:6379 npm start

APP_BASE_URL=http://localhost:3000 node scripts/measure-web-vitals.mjs
APP_BASE_URL=http://localhost:3000 node scripts/measure-web-vitals-slow3g.mjs
```

### 3. CSR origin 호출 · revalidateTag 전파 (Phase 1 실측)

```bash
# CSR 세션당 origin 호출 카운트
APP_BASE_URL=http://localhost:3000 SESSION_COUNT=10 \
  node scripts/measure-origin-fetch-per-session.mjs

# 두 포트로 같은 Redis 공유 후 전파 측정
redis-server --daemonize yes
PORT=3000 REDIS_URL=redis://localhost:6379 npm start &
PORT=3001 REDIS_URL=redis://localhost:6379 npm start &

TASK_A_URL=http://localhost:3000 TASK_B_URL=http://localhost:3001 \
  ROUNDS=5 POLL_INTERVAL_MS=100 \
  node scripts/measure-revalidate-tag-propagation.mjs
```

## 시작하기

### 요구사항
- Node.js `20.9+` (`.nvmrc` 고정)
- npm
- Docker (선택) 또는 Homebrew로 설치한 Redis

### 로컬 실행

```bash
nvm use
npm install

# Redis (Docker 또는 로컬 설치 모두 가능)
docker run --name next-redis -p 6379:6379 -d redis
# 또는
redis-server --daemonize yes --port 6379

# 환경변수
cp .env.example .env.local
# (REDIS_URL, REVALIDATION_SECRET, WEBHOOK_SIGNING_SECRET 값 채우기)

npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하면 메인의 before/after 비교와 `/dashboard`, `/experiments/*`를 전부 확인할 수 있습니다.

### 검증 명령

```bash
npm run lint
npm run typecheck
npm test
DISABLE_REDIS_CACHE_HANDLER=true npm run build
```

로컬에서 Redis 없이 빌드만 확인하려면 `DISABLE_REDIS_CACHE_HANDLER=true`를 사용하세요. 실제 Redis 연동은 Redis를 띄운 뒤 `npm start`로 확인합니다.

## 기술 스택

| 구분 | 기술 | 비고 |
| --- | --- | --- |
| Framework | Next.js 16.2.3 | App Router, self-hosting, `cacheComponents: true` |
| UI | React 19.2 | Geist 폰트, Tailwind CSS 4 다크 톤 |
| Language | TypeScript | strict mode |
| Cache | Redis 5.x | `cacheHandler` + `cacheHandlers` 이중 연결 |
| Infra | AWS ECS Fargate · ALB · ElastiCache · ECR | Terraform |
| CI/CD | GitHub Actions | main → staging 자동 배포 |
| 부하 테스트 | k6 v1.7.1 | baseline · spike · soak 3종 |
| 사용자 체감 | Lighthouse 12 | 모바일 4G · Slow 3G 2종 |
| 브라우저 계측 | Playwright | CSR/BFF + Phase 1 실측 2건 |
| Test | Vitest | 9 파일 / 34 테스트 |

## 주요 디렉토리

```text
app/
  api/revalidate/            webhook 기반 hard expire (HMAC 검증)
  api/health/                /api/health (lib/redis-client#pingRedis)
  api/metrics/               런타임 메트릭 수집
  api/cache-debug/           Redis 키 상태 조회
  dashboard/                 실측 결과 스토리라인 대시보드
    components/              Architecture · Climax · Verdict · StickyToc 등 14개
  experiments/               SSR/ISR/shared-cache/hybrid/csr/bff 6개 라우트
  components/                홈 UI (before/after 카드)
lib/
  redis-client.ts            공유 Redis 클라이언트 + pingRedis()
  env.ts                     환경변수 스키마
  metrics.ts                 인메모리 메트릭 집계
redis-handler.ts             Cache Components용 핸들러
redis-handler.cjs            (번들) cacheHandlers.default
incremental-cache-handler.js ISR/route cache용 (BUILD_NAMESPACE 격리)
proxy.ts                     request correlation ID 주입
infra/terraform/             ECR / secrets / app-stack
scripts/
  k6-{baseline,spike,soak}.js          부하 테스트
  measure-web-vitals{,-slow3g}.mjs     Lighthouse 자동화
  measure-seo-html.mjs                 UA별 HTML 길이
  measure-origin-fetch-per-session.mjs CSR origin 카운트 (Phase 1)
  measure-revalidate-tag-propagation.mjs 태스크 간 전파 측정 (Phase 1)
docs/
  blog/                      시리즈 3편 · 4편 markdown
  experiments/               실험별 분석 문서
  incident/                  운영 사고 기록 (Resolved 2건)
  load-test/                 측정 JSON 원본
  cost-estimate.md           월 인프라 비용
```

## 공식 자료 기준 확인

Next.js 공식 self-hosting 문서 기준 사실:

1. ISR을 포함한 server cache는 기본적으로 각 인스턴스의 로컬 파일시스템에 저장됨
2. 멀티 인스턴스/컨테이너 환경에서는 각 인스턴스가 자기 캐시 사본을 가짐
3. `revalidateTag()`를 한 인스턴스에서 호출하면 기본적으로 그 인스턴스만 즉시 무효화됨
4. ISR · route 응답 공유 캐시는 `cacheHandler`(단수) 영역, `use cache`는 `cacheHandlers`(복수) 영역
5. `cacheComponents: true` 프로젝트에서는 route segment config `revalidate`는 호환되지 않음

즉 "멀티 인스턴스에서 ISR 무효화가 한 인스턴스에만 먼저 반영되는 문제"는 공식 문서상 실제 고려 사항이 맞고, 이 프로젝트는 그걸 **실측 6.4ms · 편차 0ms**까지 좁혔습니다.

## 참고 링크

- https://nextjs.org/docs/app/getting-started/cache-components
- https://nextjs.org/docs/app/api-reference/directives/use-cache
- https://nextjs.org/docs/app/api-reference/functions/cacheLife
- https://nextjs.org/docs/app/api-reference/functions/cacheTag
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers
- https://nextjs.org/docs/app/guides/self-hosting