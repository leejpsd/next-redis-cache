# Next.js 16 + Redis Shared Cache Lab

Next.js를 AWS 셀프호스팅 멀티 인스턴스/멀티 태스크 환경에서 운영할 때, Redis 기반 공유 캐시로 ISR/SSG/Cache Components를 실용적으로 유지하는 방법을 검증하는 운영형 포트폴리오 프로젝트다.

> 목표는 "캐시를 붙였다"가 아니라, 다중 인스턴스 환경에서 재검증 가능성과 캐시 일관성을 확보하고, 그 결과로 원본 호출량·응답시간·인프라 자원 사용량을 얼마나 줄였는지 수치로 증명하는 것이다.

![Next.js](https://img.shields.io/badge/Next.js-16.2.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![Redis](https://img.shields.io/badge/Redis-5.10.0-DC382D?logo=redis)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## 프로젝트 개요

기본 Next.js self-hosting에서는 ISR을 포함한 서버 캐시가 인스턴스별 로컬 파일시스템과 메모리에 저장된다. 그래서 ALB 뒤에 여러 앱 인스턴스나 ECS task가 있을 때, 같은 build를 쓰더라도 캐시와 무효화가 인스턴스마다 갈라질 수 있다.

이 프로젝트는 아래 구조를 기준으로 한다.

```text
            [Client]
               |
            [ALB]
      /---------+---------\
 [Next #1]  [Next #2]  [Next #3]
      \---------+---------/
               |
            [Redis]
```

핵심 아이디어:

- ISR/SSG/Cache Components 각각이 어떤 캐시 계층을 쓰는지 분리해서 본다.
- `cacheHandler`와 `cacheHandlers`를 구분해, ISR과 Cache Components를 각각 공유 캐시로 연결하는 방향을 검증한다.
- Next 16의 권장 모델은 `use cache` / `cacheLife` / `cacheTag`를 기준으로 사용하되, 이전 모델의 `fetch(..., { next: { revalidate, tags } })`도 실제로 어떻게 동작하는지 함께 검증한다.
- Redis를 공유 캐시 저장소와 무효화 조정 계층으로 사용한다.
- 결과를 TTFB, p95/p99, origin fetch 감소, 일관성, 운영 비용 관점으로 비교한다.

## 현재 상태

2026-04-08 기준으로 아래 항목을 확인했다.

- Next.js `16.2.2`로 업그레이드 완료
- Redis 기반 `cacheHandler` 초기 구현 추가
- `proxy.ts` 기반 request correlation ID 주입 적용
- webhook 인증, nonce, rate limit, structured log 구현
- `/api/health`, `/api/metrics/*` 구현
- Redis cache handler 단위/통합 테스트 통과
- `lint`, `typecheck`, `test`, `build` 로컬 검증 완료

2026-04-09 기준으로 staging에서 아래 항목도 추가 확인했다.

- ECS Fargate 멀티 task 환경 배포 완료
- ElastiCache Redis 연결 정상
- 메인 `random-user` 캐시가 Redis에 실제 저장되는 것 확인
- `next-cache:entry:*`, `next-cache:tag:*`, `next-cache:tag-expiration:*` 키 생성 확인
- 초기 상태에서는 인스턴스별 로컬 캐시처럼 동작했지만, build/runtime 분리 이슈를 수정한 뒤 중앙 Redis shared cache 동작 확인
- Webhook 시뮬레이션 기반 hard invalidation 정상 동작 확인
- Server Action 기반 `revalidateTag("max")`는 soft revalidation 특성상 즉시 변경이 아닌, 잠시 뒤 새 값이 반영되는 것 확인

## Staging

- Staging URL: http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com
- Health: http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com/api/health
- Runtime: http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com/api/runtime
- Cache Debug: http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com/api/cache-debug

Staging에서 확인한 핵심 시나리오:

1. 메인 페이지를 여러 번 새로고침해도 같은 유저가 유지되면 shared cache가 붙은 상태다.
2. Webhook 시뮬레이션 무효화 후 다시 요청하면 새로운 유저가 바로 보일 수 있다.
3. Server Action 무효화는 `stale-while-revalidate` 성격이라 즉시 바뀌지 않을 수 있고, 잠시 뒤 다시 요청했을 때 새로운 유저가 보이는 것이 정상이다.

캐시 모델 검증 결과:

- `cacheComponents: true`에서 `export const revalidate = 60`은 빌드 에러로 막힌다.
- `await fetch(url, { next: { revalidate: 60 } })`는 production build 기준으로 캐시됨을 확인했다.
- `use cache` + `cacheLife()` 역시 production build 기준으로 캐시됨을 확인했다.
- 즉, 이 프로젝트는 권장 모델은 `use cache`를 기준으로 사용하되, fetch 기반 캐시도 여전히 설명하고 비교한다.

현재 구현 범위에 대한 중요한 메모:

- 현재 저장소는 `cacheHandlers` 중심 구현에서 시작했지만, 이제 `cacheHandler` 초기 구현도 추가되어 ISR/route cache 공유 실험의 기반이 생겼다.
- Next.js 공식 문서 기준으로 ISR과 route handler 응답 캐시는 `cacheHandler`(단수) 영역이다.
- 다만 "멀티 인스턴스에서 ISR/SSG를 Redis로 안정적으로 공유"라는 목표를 입증하려면, 현재 초기 구현에 대해 실제 ECS 멀티 태스크 환경 검증과 지표 수집이 추가로 필요하다.

검증 기준:

```bash
nvm use
npm run lint
npm run typecheck
npm test
DISABLE_REDIS_CACHE_HANDLER=true npm run build
```

주의:

- 이 프로젝트는 Node.js `20.9+`가 필요하다.
- 로컬 기본 셸이 낮은 Node 버전을 가리키면 Next 16, Vitest 4, ESLint 9가 함께 깨질 수 있다.
- `.nvmrc`는 현재 검증에 사용한 Node 버전을 고정한다.

## 아직 부족한 점

지금 상태는 운영형 베이스는 갖췄지만, 최종 포트폴리오 목적에 맞추려면 아래 작업이 더 필요하다.

- ISR/route cache용 `cacheHandler`(singular) 실환경 검증
  - 초기 구현은 추가됐지만, 멀티 태스크 환경에서의 일관성 검증과 장애 실험이 아직 없다
- `app/lib/getRandomUser.ts`를 운영형 fetch 샘플로 고도화
  - `cacheLife`, timeout, retry, fallback, fetch policy 정리 필요
- 메트릭 저장소가 아직 프로세스 메모리 중심
  - 멀티 인스턴스 전역 집계 관점 보강 필요
- README에 실측 지표, 스크린샷, 그래프, before/after 표를 더 보강해야 함
- 부하 테스트, 장애 실험, 비용 추정, 실험 비교 문서가 템플릿 단계
- health/build 과정에서 Redis 미연결 시 노이즈 로그가 남음

## 핵심 기능

- Redis 기반 공유 캐시 실험 베이스
- 태그 기반 무효화
- soft stale / hard expire 구분
- HMAC 기반 webhook 검증
- nonce replay 방지
- Redis 기반 rate limit
- readiness/liveness health endpoint
- consistency / invalidation / prefetch metrics
- ECS + ALB + ElastiCache Terraform 스택
- GitHub Actions 기반 CI / staging / production 배포 워크플로

## 기술 스택

| 구분 | 기술 | 비고 |
| --- | --- | --- |
| Framework | Next.js 16.2.2 | App Router, self-hosting |
| UI | React 19.2.0 | App Router |
| Language | TypeScript | strict mode |
| Cache | Redis 5.x | 공유 캐시 및 무효화 조정 계층 |
| Infra | AWS ECS / ALB / ElastiCache | Terraform |
| CI/CD | GitHub Actions | CI, staging, production |
| Test | Vitest | unit / integration |

## 시작하기

### 1. 요구사항

- Node.js `20.9+`
- npm
- Docker
- 로컬 Redis 또는 `DISABLE_REDIS_CACHE_HANDLER=true` 빌드 전략

### 2. 의존성 설치

```bash
nvm use
npm install
```

### 3. 환경변수 준비

`.env.example`를 기준으로 `.env.local`을 준비한다.

```env
REDIS_URL=redis://localhost:6379
REVALIDATION_SECRET=change-me-to-a-32-char-random-secret
WEBHOOK_SIGNING_SECRET=change-me-to-another-32-char-random-secret
APP_BASE_URL=http://localhost:3000
REVALIDATE_RATE_LIMIT_PER_MINUTE=30
WEBHOOK_MAX_SKEW_SECONDS=300
WEBHOOK_NONCE_TTL_SECONDS=600
```

### 4. Redis 실행

```bash
docker run --name next-redis -p 6379:6379 -d redis
```

### 5. 앱 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 검증 명령어

```bash
npm run lint
npm run typecheck
npm test
DISABLE_REDIS_CACHE_HANDLER=true npm run build
```

메모:

- 로컬에서 Redis 없이 `build`만 확인할 때는 `DISABLE_REDIS_CACHE_HANDLER=true`를 권장한다.
- 실제 Redis 연동 동작은 Redis를 띄운 뒤 `npm run dev` 또는 `npm start`로 확인한다.

## 주요 경로

```text
app/
  api/revalidate/          webhook 기반 hard expire
  api/health/              readiness/liveness
  api/metrics/             런타임 메트릭 수집
  components/              데모 UI 및 prefetch 실험 UI
  lib/getRandomUser.ts     캐시 fetch 샘플
lib/
  env.ts                   환경변수 스키마
  metrics.ts               인메모리 메트릭 집계
  redis-client.ts          Redis 클라이언트 팩토리
redis-handler.ts           Next cache handler
proxy.ts                   request correlation ID 주입
infra/terraform/           ECR / secrets / app-stack
ops/                       CloudWatch / deploy 스크립트
docs/                      실험, 장애, 비용, 학습 문서
```

## 캐시 전략 요약

### 왜 Redis가 필요한가

Next.js 공식 self-hosting 문서 기준으로 ISR을 포함한 서버 캐시는 기본적으로 각 서버 인스턴스의 로컬 파일시스템에 저장된다. 멀티 인스턴스/멀티 태스크 환경에서는 각 인스턴스가 자기 캐시 사본을 가지므로, 공유 캐시 없이 운영하면 인스턴스마다 stale 상태가 달라질 수 있다.

이 프로젝트는 그 문제를 Redis 기반 공유 캐시로 줄이고, 실제로 자원 사용량과 응답시간이 얼마나 좋아지는지 실험하는 것이 목적이다.

### `cacheHandler` vs `cacheHandlers`

| 설정 | 대상 | 현재 상태 |
| --- | --- | --- |
| `cacheHandler` | ISR, route handler 응답, optimized images 등 서버 캐시 | Redis 초기 구현 추가 |
| `cacheHandlers` | `use cache` / Cache Components | Redis 핸들러 구현 완료 |

### Next 16에서 무엇을 권장하나

`cacheComponents: true`를 사용하는 Next 16에서는 새 권장 모델이 `use cache` 중심이다.

- 권장 중심:
  - `use cache`
  - `cacheLife()`
  - `cacheTag()`
  - `revalidateTag()`
  - `updateTag()`
- 여전히 사용 가능:
  - `fetch(..., { next: { revalidate: 60 } })`
  - `fetch(..., { next: { tags: ["sample"] } })`
- 이 프로젝트에서 실제로 막힌 것:
  - `export const revalidate = 60`
    - `cacheComponents: true`에서는 route segment config `revalidate`가 빌드 에러를 발생시킴

즉 이 저장소의 실무 원칙은 아래와 같다.

1. 기본 설계와 신규 구현은 `use cache` 계열을 우선한다.
2. 기존 모델이나 fetch 단위 캐시가 더 적합한 경우 `fetch next.revalidate/tags`도 사용 가능하다고 설명한다.
3. route segment `revalidate`는 `cacheComponents: true` 프로젝트에서는 사용하지 않는다.

### 캐시 모델 검증 메모

production 기준 검증 경로:

- `/verify/fetch-revalidate-only`
- `/verify/use-cache`

검증 결과:

- `fetch next.revalidate only` 경로는 두 번 조회 시 같은 응답을 반환해 캐시됨을 확인했다.
- `use cache + cacheLife` 경로도 두 번 조회 시 같은 응답을 반환해 캐시됨을 확인했다.
- 이 검증은 [`scripts/e2e-cache-model-check.mjs`](./scripts/e2e-cache-model-check.mjs) 로 재현 가능하다.

### Soft stale

Server Action에서 `revalidateTag(tag, "max")`를 호출해 stale-while-revalidate 경로를 탄다.

현재 staging에서 확인한 체감 동작:

1. 버튼 직후 바로 새로고침하면 이전 값이 남아 있을 수 있다.
2. 조금 뒤 다시 요청하면 새 값으로 교체된다.
3. 즉, 현재 구현은 "즉시 hard expire"가 아니라 soft revalidation semantics에 가깝게 동작한다.

### Hard expire

Webhook이나 외부 동기화 이벤트에서 `revalidateTag(tag, { expire: 0 })`를 호출해 즉시 만료시킨다.

현재 staging에서 확인한 체감 동작:

1. Webhook 시뮬레이션 버튼으로 무효화를 요청한다.
2. 다시 요청하면 즉시 다른 유저가 보일 가능성이 높다.
3. soft revalidation보다 훨씬 직접적인 invalidation UX를 제공한다.

### 현재 구현 포인트

- 캐시 엔트리는 Redis JSON + base64 stream 형태로 저장
- 태그 인덱스는 Redis Set으로 유지
- hard expire 시 태그 인덱스를 통해 연결된 엔트리를 삭제
- soft stale 시 태그 expiration marker만 갱신

## 운영 문서와 산출물

아래 문서들은 포트폴리오 마감 전까지 채워야 하는 핵심 산출물이다.

- [Next.js 16 캐시 심화 노트](./docs/study/nextjs16-cache-deep-dive.md)
- [SSR vs ISR vs Cache Components 비교](./docs/experiments/ssr-vs-isr-vs-cache-components.md)
- [BFF vs Direct Client Call 비교](./docs/experiments/bff-vs-direct-client-call.md)
- [멀티 인스턴스 일관성 before/after](./docs/experiments/multi-instance-consistency-before-after.md)
- [Prefetch 정책 비교](./docs/experiments/prefetch-policy-comparison.md)
- [Redis 장애 리포트](./docs/incident/redis-outage-report.md)
- [App 재시작 장애 리포트](./docs/incident/app-restart-report.md)
- [Load Test Summary](./docs/load-test/summary.md)
- [배포/롤백 런북](./docs/ops/runbook-deploy-rollback.md)
- [비용 추정](./docs/cost-estimate.md)

## 알려진 리스크

- 현재 프로젝트는 목표상 ISR/SSG 공유 캐시까지 다루며, `cacheHandler` 초기 구현까지 추가되었다. 다만 운영 입증은 아직 남아 있다.
- Redis 장애 시 캐시 핸들러 연결 실패가 응답 경로와 빌드 로그에 노출될 수 있다.
- 현재 메트릭은 프로세스 메모리 기반이라 멀티 인스턴스 총합 지표로 바로 쓰기 어렵다.
- fetch 샘플이 아직 운영형 정책을 모두 반영하지 못했다.
- BFF 트랙과 성능 실험 문서는 아직 구현 전 단계다.

## 공식 자료 기준 확인 사항

Next.js 공식 self-hosting 문서(최종 확인: 2026-04-08) 기준으로 확인한 사실:

1. ISR을 포함한 Next.js server cache는 기본적으로 각 서버 인스턴스의 로컬 파일시스템에 저장된다.
2. 멀티 인스턴스/컨테이너 환경에서는 각 인스턴스가 자기 캐시 사본을 가진다.
3. App Router 멀티 인스턴스 환경에서 `revalidateTag()`를 한 인스턴스에서 호출하면 기본적으로 그 인스턴스만 즉시 무효화된다.
4. ISR과 route response 공유 캐시는 `cacheHandler`(singular)로 다뤄야 하고, `use cache`는 `cacheHandlers`(plural)로 다뤄야 한다.
5. `cacheComponents: true` 프로젝트에서는 route segment config `revalidate`는 호환되지 않으며, 새 권장 모델은 `use cache` 계열이다.

즉, "멀티 인스턴스에서 ISR 무효화가 한 인스턴스에만 먼저 반영되는 문제"는 공식 문서상 실제 고려사항이 맞다.

## 참고 자료

- https://nextjs.org/docs/app/getting-started/cache-components
- https://nextjs.org/docs/app/api-reference/directives/use-cache
- https://nextjs.org/docs/app/api-reference/functions/cacheLife
- https://nextjs.org/docs/app/api-reference/functions/cacheTag
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- https://nextjs.org/docs/app/api-reference/functions/updateTag
- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers
- https://nextjs.org/docs/app/guides/self-hosting
- https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath
- https://nextjs.org/docs/messages/middleware-to-proxy
