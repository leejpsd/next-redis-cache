# Health endpoint가 Redis degraded 오판하는 문제

**상태: Resolved (2026-04-20)** — `/api/health`를 `lib/redis-client#pingRedis`로 통일하면서 해결. 자세한 내용은 하단 "Resolution" 섹션.

## 관찰 (2026-04-19, staging)

- `/api/health` → `503`, `checks.redis.ok = false`, `latencyMs = -1`
- `/api/cache-debug` → `200`, `next-cache:entry:*`, `next-cache:tag:*` 키 정상 반환
- `/experiments/shared-cache` 등 Cache Components 경로 모두 `200`, 콘텐츠 정상 렌더

즉, 실제 Redis 연결은 살아 있고 cacheHandlers 경로는 정상 동작 중이지만, health 체크만 실패한다.

## 원인 후보

두 엔드포인트가 서로 다른 Redis 클라이언트를 사용한다.

- `/api/cache-debug` → `lib/redis-client.ts`의 `getRedisClient()` (정상)
- `/api/health` → `redis-handler.ts`의 `checkRedisPing()` (내부 `connectClient()`) (실패)

`/api/health`의 `latencyMs = -1`은 `route.ts`에서 `await import("@/redis-handler")` 자체가 throw 했을 때의 하드코딩 값이다. 즉 동적 import 또는 내부 `connectClient()`가 프로덕션 런타임에서 실패하고 있다.

가능성:

1. 프로덕션 빌드 결과물에서 `redis-handler.cjs`가 Next.js 런타임과 다른 경로로 번들되어, health route에서의 `await import("@/redis-handler")`가 cjs를 못 찾는다.
2. `connectClient()`가 health route의 콜드 스타트 시점에 race로 실패한 뒤 캐시된 실패 상태를 재사용한다.

## 측정에 미치는 영향

없다. cacheHandlers 경로가 정상 동작하므로 성능/일관성 측정은 그대로 진행 가능.

## 후속 작업

- 4편 측정 완료 후 health route만 `lib/redis-client`로 통일하거나, `redis-handler`에서 health 전용 export 경로를 별도로 두어 dynamic import 의존을 제거한다.
- ALB target group health check를 `/api/runtime`처럼 외부 의존 없는 경로로 바꾸는 것도 고려.

## Resolution (2026-04-20)

### 수정 내용

1. `lib/redis-client.ts`에 `pingRedis()` 함수 추가
   - `await getRedisClient()` + `client.ping()`을 **static import**로 호출
   - 1.5s 타임아웃으로 health 응답이 Redis 지연에 끌려가지 않도록 격리
   - 실패 이유를 `reason: "fallback" | "disconnected" | "timeout" | "error"`로 구분해 반환
2. `app/api/health/route.ts`가 이 새 함수를 사용하도록 변경
   - 기존의 `await import("@/redis-handler")` 제거
   - 응답에 `checks.redis.reason` 필드 추가
3. `redis-handler.ts`의 `checkRedisPing()`은 `redis-handler.cjs` 공개 API 호환을 위해 존치. 주석으로 legacy 표시.
4. 단위 테스트를 `pingRedis` mock으로 업데이트하고 fallback 케이스 추가 (총 3케이스)

### 수정으로 얻은 것

- **단일 Redis 클라이언트** — cache-debug와 health가 같은 `getRedisClient()`를 공유
- **관심사 분리** — Next cache handler 전용(`redis-handler`)과 일반 운영용(`lib/redis-client`)의 경계가 명확
- **진단 가능성** — degraded 상태일 때 reason으로 원인(연결 끊김 / 타임아웃 / 알 수 없는 에러)을 바로 구분

### 재발 방지

- health는 Redis 체크를 포함하되, **ALB target group은 `/api/runtime`을 계속 사용**. 이렇게 해야 Redis 순간 장애가 ALB 레벨에서 트래픽 끊김으로 증폭되지 않는다. (liveness는 얕게, readiness/deep health는 깊게 — 분리 유지)
