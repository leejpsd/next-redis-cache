# Load Test Summary

## 목적

Cache hit 경로와 invalidation 경로의 응답시간, 에러율, 안정성을 측정해 SLO 초안과 비교한다.

## 실행 목록

| 테스트 | 파일 | 상태 | 비고 |
| --- | --- | --- | --- |
| baseline | `baseline.json` | 완료 | staging ALB 기준 1차 baseline 확보 |
| rendering strategies | `rendering-strategies.json` | 완료 | 2026-04-14 측정 (기존) |
| rendering strategies (refresh) | `2026-04-19/rendering-strategies.json` | 완료 | 2026-04-19 재측정, 전반적으로 개선 |
| browser strategies | `browser-strategies.json` | 완료 | 2026-04-14 측정, CSR/BFF 브라우저 계측 |
| browser strategies (refresh) | - | 차단됨 | staging에서 `_next/static/*` 404로 Playwright 측정 불가. `docs/incident/static-chunk-404-turbopack-mismatch.md` 참조 |
| spike | `2026-04-19/spike.json` | 완료 | 3 경로 동시 ramping (peak 30 VUs × 3) |
| soak | `2026-04-19/soak.json` | 진행 | shared-cache 경로 30분 constant 10 VUs |

## 공통 환경

- 대상 URL: `APP_BASE_URL` 환경변수로 주입
- 기본 대상: staging ALB
- 인스턴스 수: ECS task 2개 기준
- Redis 구성: ElastiCache Redis shared cache
- 테스트 도구: `k6`

## Baseline 시나리오

기준 baseline은 아래 2개 경로를 함께 측정한다.

- `/`
  - 메인 비교 화면
- `/verify/use-cache`
  - `use cache` 경로

실행 명령:

```bash
APP_BASE_URL=http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com \
npm run test:load:baseline
```

기본 결과 파일:

```text
docs/load-test/baseline.json
```

## 임계치

- API p95 <= 300ms
- API p99 <= 800ms
- 에러율 <= 1%
- invalidation latency p95 <= 1s

## 결과 요약

| 테스트 | p50 | p95 | p99 | 에러율 | 비고 |
| --- | --- | --- | --- | --- | --- |
| baseline | 196.6ms | 912.0ms | 측정 필요 | 0.19% | `/`는 무겁고 `/verify/use-cache`는 안정적 |
| rendering strategies (2026-04-14) | 217.2ms | 684.3ms | 측정 필요 | 0% | SSR이 가장 느리고 ISR(fetch)가 가장 빠름 |
| rendering strategies (2026-04-19) | 197.6ms | 597.9ms | 1120ms | 0.11% | 재측정, 전반적으로 이전보다 안정 |
| browser strategies | 499.4ms(CSR) / 571.0ms(BFF) | 558.5ms(CSR) / 3692.0ms(BFF) | 측정 필요 | 0% | BFF가 운영상 이점은 있지만 outlier가 큼 |
| spike (2026-04-19) | 660ms | 1690ms | 측정 필요 | 0.53% | 3경로 동시 30VU × 5분 hold, ISR이 가장 견고 |
| soak (2026-04-19) | 181.5ms | 217.5ms | 측정 필요 | 0.00% | 30분 shared-cache 10VU, 태그 인덱스 누수 없음 |

## 해석

### baseline 해석

- 전체 요청 수: `532`
- 전체 실패 수: `1`
- 전체 실패율: 약 `0.19%`
- 전체 `http_req_duration`
  - 평균: `352.8ms`
  - p50: `196.6ms`
  - p95: `912.0ms`
- 메인 `/`
  - 평균: `616.1ms`
  - p95: `1327.6ms`
  - 최대: `2308.4ms`
- `/verify/use-cache`
  - 평균: `190.3ms`
  - p95: `281.2ms`
  - 최대: `584.5ms`

### 관찰

1. `use cache` 경로(`/verify/use-cache`)는 staging 기준으로 상당히 안정적이다.
2. 메인 `/` 경로는 비교 카드, 컨트롤, 메트릭 패널 등이 같이 렌더되어 상대적으로 무겁다.
3. 실패는 1건만 발생했으며, baseline 출발점으로는 충분히 사용할 수 있다.
4. 다음 실험에서는 `/`와 `/verify/use-cache`를 분리해서 해석하는 것이 적절하다.

### rendering strategies 해석

- 전체 요청 수: `816`
- 전체 실패 수: `0`
- 전체 실패율: `0%`
- 전체 `http_req_duration`
  - 평균: `325.6ms`
  - p50: `217.2ms`
  - p95: `684.3ms`
- `/experiments/ssr`
  - 평균: `613.5ms`
  - p95: `1334.8ms`
  - 최대: `4881.2ms`
- `/experiments/isr-fetch`
  - 평균: `217.3ms`
  - p95: `309.4ms`
  - 최대: `639.9ms`
- `/experiments/shared-cache`
  - 평균: `244.7ms`
  - p95: `420.3ms`
  - 최대: `1401.0ms`

### rendering strategies 관찰

1. `SSR`은 요청마다 원본 fetch와 렌더 비용이 들어가므로 가장 느렸다.
2. `ISR(fetch)`는 이번 세 전략 중 가장 낮은 평균과 p95를 보여, 서버 전략의 가장 효율적인 절충안으로 보였다.
3. `shared-cache`는 `ISR(fetch)`보다 Redis 접근 비용 때문에 약간 무겁지만, 여전히 `SSR`보다는 훨씬 빠르다.
4. 따라서 "서버에서 렌더한다" 자체보다 "어떤 서버 캐시 전략을 쓰느냐"가 비용과 성능을 크게 좌우한다는 근거를 확보했다.

### browser strategies 해석

- 측정 횟수: 각 경로 7회
- `/experiments/csr`
  - `pageReadyMs`
    - 평균: `1816.8ms`
    - p95: `1838.3ms`
  - `browserFetchMs`
    - 평균: `504.5ms`
    - p95: `558.2ms`
  - `readyToPaintMs`
    - 평균: `504.8ms`
    - p95: `558.5ms`
- `/experiments/bff`
  - `pageReadyMs`
    - 평균: `2442.7ms`
    - p95: `5052.6ms`
  - `browserFetchMs`
    - 평균: `1120.4ms`
    - p95: `3690.7ms`
  - `readyToPaintMs`
    - 평균: `1120.9ms`
    - p95: `3692.0ms`
  - `bffServerMs`
    - 평균: `933.9ms`
    - p95: `3536.5ms`

### browser strategies 관찰

1. 이번 측정에서는 `CSR direct client call`이 `BFF`보다 일관되게 빨랐다.
2. `BFF`는 7회 중 2회가 크게 튀면서 평균과 p95가 크게 올라갔다.
3. 즉 `BFF`는 단순히 "조금 느린 정도"가 아니라, 현재 staging 기준으로는 outlier를 동반하는 전략으로 보인다.
4. 다만 `BFF`는 성능 자체보다 보안, 응답 정규화, 레이트 리밋, 관측성, 캐시 삽입 지점을 얻기 위한 전략이라는 점을 같이 봐야 한다.
5. 따라서 "브라우저가 직접 부르면 더 빠르다"는 결과와 "그 대신 운영 제어권을 어디서 확보할 것인가"를 함께 비교하는 문맥에서 해석해야 한다.

### 다음 액션

1. 실패 1건의 원인이 일시적인 warm-up인지 확인
2. 같은 조건으로 한 번 더 baseline을 재실행해 재현성 확인
3. BFF outlier가 origin fetch 문제인지, ECS task 편차인지, cold path인지 추가 관측
4. CSR / BFF 결과를 `bff-vs-direct-client-call.md`에 반영
5. 이후 spike 테스트로 확장

### spike (2026-04-19) 해석

- 프로파일: 3 경로 동시 실행, 각 경로 ramp-up 1m → 30 VU × 5m hold → ramp-down 1m (동시 피크 90 VUs)
- 원본: `docs/load-test/2026-04-19/spike.json`

| 경로 | avg | p90 | p95 | max |
| --- | --- | --- | --- | --- |
| `/experiments/ssr` | 1120ms | 1.73s | 1.95s | 5.43s |
| `/experiments/isr-fetch` | 482ms | 825ms | 1.04s | 3.50s |
| `/experiments/shared-cache` | 899ms | 1.52s | 1.79s | 4.23s |

#### spike 관찰

1. ISR(fetch)이 스파이크에서 가장 견고하다. p95 1초 근처.
2. Cache Components + Redis는 평상시 228ms → 스파이크 899ms로 4배 가까이 증가. Redis 네트워크 왕복 대기가 원인으로 보인다. `cache.t4g.micro` 사용 중이라 Redis가 병목이 되기 쉬운 구성이다.
3. SSR은 avg 1초 초과, p95 2초 근처. 가장 먼저 무너진다.
4. **핵심 발견**: 20,377 요청이 오간 뒤에도 Redis의 `entryKeys` 수는 여전히 1. `cache-debug-post-spike.json` 참조. 스파이크에서도 **원본 호출은 TTL 주기만큼만 일어나고, 그 외 모든 요청이 같은 캐시 키에 hit**했다는 증거다.

### soak (2026-04-19) 해석

- 프로파일: `/experiments/shared-cache` 30분 constant 10 VUs
- 원본: `docs/load-test/2026-04-19/soak.json`, `cache-debug-post-soak.json`

| 지표 | 값 |
| --- | --- |
| 총 요청 수 | 18,164 |
| avg | 190.1ms |
| p95 | 217.5ms |
| max | 1167ms |
| 에러율 | 0.00% (실패 1건) |
| Redis entryKeys (시작 / 종료) | 1 / 1 |
| Redis tagKeys (시작 / 종료) | 1 / 1 |
| Redis tagExpirationKeys (시작 / 종료) | 1 / 1 |

#### soak 관찰

1. 장시간 안정성 검증 통과. 30분간 p95 217ms, 에러율 0%.
2. 태그 인덱스 누수 없음. `cacheLife`와 태그 만료 정책이 실제로 작동하며 키를 정리하고 있다.
3. Baseline 측정(avg 228ms, p95 354ms)보다 soak 평균이 더 낮은 것은 캐시가 warm 상태로 고정되어 분산이 좁아졌기 때문.
4. "일관성을 위해 감수한 Redis 네트워크 왕복 비용"은 장시간 평균으로 보면 거의 드러나지 않는다. 스파이크 순간에만 드러나고 평상시는 ISR과 차이가 미미하다.
