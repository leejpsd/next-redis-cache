# Web Vitals + SEO 측정 결과 (2026-04-19)

이 문서는 "CSR과 SSR/ISR 사이의 체감 성능 차이"를 Lighthouse와 HTML 구조 분석으로 증명하기 위한 측정 결과를 담는다. 기존 k6 측정(서버 응답 시간)과 달리, **사용자 체감 관점**에서 전략을 비교한다.

## 측정 대상 전략

| 경로 | 전략 | 비고 |
| --- | --- | --- |
| `/experiments/ssr` | SSR (`no-store`) | 매 요청 원본 호출 |
| `/experiments/isr-fetch` | ISR (fetch revalidate 60s) | 공유 캐시 |
| `/experiments/shared-cache` | Cache Components + Redis | `use cache` + `cacheLife` + `cacheTag` |
| `/experiments/hybrid` | **Streaming SSR + per-section Cache Components** | 이번 편에서 새로 추가 |
| `/experiments/csr` | CSR (브라우저 fetch) | |
| `/experiments/bff` | BFF 경유 CSR | |

Hybrid 경로는 shell은 즉시 내려오고, 섹션 3개(배너·랭킹·피드)가 Suspense 경계로 병렬 스트리밍된다. 섹션마다 `cacheLife`가 다르다.

## 1. SEO HTML 분석 (초기 HTML 본문 포함 여부)

같은 URL에 대해 Browser / Googlebot / naked curl UA로 요청하여 **텍스트 본문 길이**를 측정했다.
원본: `docs/load-test/2026-04-19/seo-html-local.json`

| 전략 | text length (browser) | 이름 포함 | CSR 로딩 마커 |
| --- | --- | --- | --- |
| SSR | 3,216 | Y | n |
| ISR | 3,239 | Y | n |
| shared-cache | 3,295 | Y | n |
| **hybrid** | **751** | Y | n (shell + fallback) |
| CSR | **165** | Y | **Y** |
| BFF | **143** | Y | **Y** |

### 관찰

1. **SSR / ISR / shared-cache는 모두 3,200 chars 이상의 풀 본문을 HTML에 포함**한다. 크롤러가 JS 실행 없이도 콘텐츠를 볼 수 있다.
2. **CSR / BFF는 HTML 본문이 143~165 chars**에 불과하고, 대부분이 "브라우저에서 데이터를 가져오는 중입니다" 같은 로딩 메시지다. JS 실행 실패 환경에서는 빈 페이지가 된다.
3. **Hybrid는 중간값(751 chars)** 이다. Shell(제목·설명·runtime identifier)은 즉시 포함되고, 3개 섹션은 Suspense fallback 상태로 초기 HTML에 들어간 뒤 스트리밍으로 교체된다. 즉 사용자 / 크롤러가 "무엇을 보는 페이지인지"는 즉시 알 수 있다.

이 하나만으로도 **CSR 기반 페이지를 SEO·접근성이 필요한 공개 페이지에 쓰면 안 된다**는 근거가 확보된다.

## 2. Lighthouse Web Vitals — 모바일 4G 프로파일

로컬 production build 환경에서 5 runs × 6 전략 × Moto G4 에뮬레이션.
원본: `docs/load-test/2026-04-19/web-vitals-mobile-local.json`

| 전략 | LCP (avg) | FCP (avg) | TBT (avg) | CLS | Performance Score |
| --- | --- | --- | --- | --- | --- |
| ISR | **1,746ms** | 756ms | 40ms | 0.000 | 100 |
| **Hybrid** | **1,743ms** | 754ms | 39ms | 0.000 | 100 |
| shared-cache | 1,904ms | 755ms | 40ms | 0.000 | 100 |
| SSR | 1,900ms | 756ms | 37ms | 0.000 | ~100 |
| BFF | 1,987ms | 755ms | 40ms | 0.000 | 99 |
| **CSR** | **3,200ms** | 755ms | 40ms | 0.000 | 93 |

### 관찰

1. **ISR과 Hybrid가 공동 1위** (LCP 1743~1746ms). Hybrid는 스트리밍 덕분에 shell을 즉시 내려 주면서도 캐시된 섹션의 LCP가 ISR과 동등.
2. **CSR의 LCP는 3,200ms** — ISR의 **1.83배**. 첫 실행은 4,451ms까지 치솟음. HTML → JS 로드 → 브라우저 fetch → paint 순서라 구조적으로 느리다.
3. **FCP는 전략 무관하게 ~755ms** — 첫 픽셀은 다들 비슷하지만, 실제 콘텐츠가 드러나는 LCP에서 차이가 확 벌어진다.
4. **Performance Score로 보면 CSR만 100점 아래(93)**. 나머지는 99~100.

### LCP를 기준으로 본 비교

```
ISR      ████████████████ 1746ms
Hybrid   ████████████████ 1743ms
SSR      █████████████████▌ 1900ms
shared   █████████████████▌ 1904ms
BFF      ██████████████████ 1987ms
CSR      █████████████████████████████ 3200ms   ← +1454ms (+83%)
```

## 3. Lighthouse Web Vitals — Slow 3G (400kbps, RTT 400ms, CPU 4x)

네트워크가 약한 환경에서 격차가 얼마나 벌어지는지 확인.
원본: `docs/load-test/2026-04-19/web-vitals-slow3g.json`

| 전략 | LCP (avg) | FCP | Performance Score |
| --- | --- | --- | --- |
| ISR | **5,693ms** | 2,004ms | 77 |
| **Hybrid** | **5,693ms** | 2,005ms | 77 |
| SSR | 6,119ms | 2,005ms | 76 |
| shared-cache | 6,093ms | 2,005ms | 76 |
| BFF | 6,275ms | 2,005ms | 76 |
| **CSR** | **8,398ms** | 2,003ms | 73~74 |

### 관찰

1. **Slow 3G에서 CSR은 LCP 8.4초**, ISR/Hybrid는 5.7초. **격차는 +2.7초 (+47%)**.
2. 모바일 4G 대비 절대값은 모두 커졌지만 **순위와 상대적 격차는 유지**. 즉 CSR의 구조적 불리함은 네트워크가 느릴수록 더 크게 드러난다.
3. **Hybrid는 Slow 3G에서도 ISR과 동률**. 스트리밍 구조가 저속 환경에서도 유효하다는 근거.

## 4. 종합 — 왜 "CSR이 서버비 아낀다"는 주장이 반쪽인가

"서버비 아까우니 CSR로 유저에게 던져라"는 주장은 **서버 비용만 본 시각**이다. 이번 측정이 보여주는 실제 트레이드오프:

| 관점 | SSR/ISR/Hybrid | CSR |
| --- | --- | --- |
| 서버 응답 시간 | 평균 190~480ms | (서버 렌더 없음) |
| 사용자 체감 LCP (모바일 4G) | 1743~1904ms | **3,200ms** |
| Slow 3G LCP | 5693~6275ms | **8,398ms** |
| SEO HTML 본문 | 3,200+ chars | **143~165 chars** |
| JS 실행 실패 시 | 정상 노출 | **빈 페이지** |
| 원본 API 장애 시 | stale cache 서빙 가능 | **전 사용자 에러** |
| 서버 CPU | 캐시 히트 시 거의 0 | 0 |
| 원본 API 호출량 | TTL 주기당 1회 | **사용자 수만큼** |

즉 CSR이 실제로 아끼는 것은 **Next 서버의 렌더 CPU뿐**이고, 그 대가로 **사용자 체감, SEO, 원본 API 부하, 장애 복원력**을 전부 밀어낸다. 이 프로젝트 인프라 기준으로 렌더 CPU 절감은 월 $22 수준(태스크 1개분)이고, 그것을 위해 LCP를 1.5~2배 늦추는 건 비합리적이다.

## 5. Hybrid 전략이 가치 있는 이유

Hybrid 경로는 메인 페이지/대시보드 같은 **한 화면 안에 성격이 다른 여러 데이터가 섞이는 경우**의 현실적 답이다.

```
┌──────────────────────────────────────────┐
│ Shell                                    │ ← 즉시 SSR (no cache)
│ Experiment / Hybrid                      │
├──────────────────────────────────────────┤
│ [배너]    use cache / life=hours         │ ← 거의 안 바뀜, 긴 TTL
│ [랭킹]    use cache / life=minutes       │ ← 분 단위 갱신
│ [피드]    fetch no-store                 │ ← 실시간
└──────────────────────────────────────────┘

브라우저 수신 순서:
  1. Shell HTML (즉시)
  2. 각 섹션 Suspense fallback
  3. 섹션별로 준비되는 대로 스트리밍 교체 (병렬)
```

### 측정에서 확인한 특성

- 초기 HTML 본문: 751 chars (shell + 3개 fallback) — CSR보다 5배 큼
- LCP: 1,743ms (ISR과 동률)
- 각 섹션은 독립적 캐시 계층이라 무효화도 독립적 (`revalidateTag("hybrid:banner")` 등)
- 배너가 배포 변경되어도 랭킹/피드는 재렌더될 필요 없음 → origin fetch 최적화

### 언제 쓰는가

- 섹션별로 갱신 주기가 완전히 다른 화면 (커머스 메인, 대시보드)
- 한 섹션의 원본 API 지연이 전체 페이지를 막지 말아야 하는 경우
- SEO와 실시간성을 둘 다 포기할 수 없을 때

## 6. 4편 블로그에 반영할 핵심

- 서버 시간만 비교한 기존 결과에 **"사용자 체감 LCP"** 축을 추가.
- CSR은 서버 비용은 아끼지만 **LCP 1.5~2배, SEO 본문 20분의 1, 장애 복원력 없음** — 총비용으로 보면 비쌈.
- **Hybrid(Streaming SSR + per-section Cache Components)**는 ISR과 동등한 LCP를 내면서도 섹션별 독립 캐시를 얻는다 → 메인 페이지의 현실적 답.
- 결론 강화: "어느 전략이 빠른가"가 아니라 **"사용자 체감 × SEO × 운영 복원력을 동시에 만족시키면서 서버 비용도 최소화하는가"**가 맞는 질문.
