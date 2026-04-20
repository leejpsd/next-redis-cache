# Cost Estimate

## 목적

포트폴리오 데모 환경(`next-redis-cache-staging`)의 월 예상 비용을 정리하고, 렌더링 전략별로 이 비용 구조가 어떻게 달라지는지 설명한다.

## 1. 실제 구성 (Terraform 기준)

`infra/terraform/app-stack/variables.tf`의 기본값을 기준으로 한다.

| 항목 | 값 |
| --- | --- |
| 리전 | `ap-southeast-2` (Sydney) |
| ECS 런치 타입 | Fargate |
| ECS 태스크 수 | 2 (`desired_count`) |
| ECS 태스크 스펙 | CPU 0.5 vCPU(512) / Memory 1 GB(1024 MiB) |
| ALB | 1개, HTTP 리스너 (HTTPS는 옵션) |
| ElastiCache 노드 | `cache.t4g.micro` 1개, Single-AZ |
| Redis 엔진 | `7.1` |
| CloudWatch Logs | 14일 보존, Container Insights 활성 |

## 2. 가정 (트래픽)

포트폴리오 데모용으로 현실적인 범위를 잡는다.

- **기준 트래픽**: 월 100만 요청 (약 23 req/s 평균)
- **응답 크기**: HTML 평균 40 KB, 정적 자산 제외 (정적 자산은 ALB 경유하지만 CloudFront를 미사용한 셀프호스팅 환경 기준)
- **무효화 이벤트**: 하루 50건 (운영자 액션 + CMS 웹훅)

## 3. 월 예상 비용 (USD, ap-southeast-2 온디맨드 요율 기준)

> 요율은 AWS 공식 2026-04 기준. 리전/시점에 따라 변동 가능.

| 항목 | 구성 | 단가 | 수량 | 월 비용 | 비고 |
| --- | --- | --- | --- | --- | --- |
| ECS Fargate vCPU | 2 task × 0.5 vCPU | $0.05056/vCPU·hr | 730 hr | **$36.91** | 2 × 0.5 × 730 × 0.05056 |
| ECS Fargate Memory | 2 task × 1 GB | $0.00553/GB·hr | 730 hr | **$8.07** | 2 × 1 × 730 × 0.00553 |
| ALB 시간당 요금 | 1개 | $0.02700/hr | 730 hr | **$19.71** | |
| ALB LCU | 평균 1 LCU 가정 | $0.00800/LCU·hr | 730 hr | **$5.84** | 데모 트래픽 기준 보수적 |
| ElastiCache Redis | `cache.t4g.micro` 1노드 | $0.02200/hr | 730 hr | **$16.06** | Single-AZ |
| CloudWatch Logs | Ingestion 3 GB/월 + 보존 | $0.76/GB + 저장비 | 3 GB | **$2.50** | 데모 추정 |
| CloudWatch Container Insights | 태스크 2개 기준 | 커스텀 메트릭 + dashboard | - | **$5.00** | 보수적 추정 |
| 데이터 전송 (Out to Internet) | 40 KB × 100만 | $0.114/GB (1GB 무료 제외) | ≈ 38 GB | **$4.22** | HTML 기준, 정적 자산 별도 |
| **합계** | | | | **$98.31/월** | 약 **13만 원** (1,350 KRW/USD 가정 시) |

### 3-1. 주요 단가 출처

- Fargate: AWS Fargate Pricing (ap-southeast-2, Linux/X86)
- ALB: Elastic Load Balancing Pricing
- ElastiCache: `cache.t4g.micro` on-demand
- Data transfer: 100 GB까지 $0.114/GB

## 4. 렌더링 전략별 비용 영향

같은 인프라에서 **각 전략이 어떤 비용 항목을 밀어올리는지**를 정리한다. 측정 결과는 `docs/load-test/2026-04-19/`와 `docs/load-test/summary.md` 참조.

### 4-1. 트래픽 100만 요청/월, 캐시 TTL 60초 기준 origin fetch 예상 횟수

| 전략 | origin fetch/월 | 근거 |
| --- | --- | --- |
| SSR (`no-store`) | **1,000,000회** | 모든 요청이 원본 호출 |
| ISR (fetch revalidate 60s) | ~43,200회 | 60초 간격 재검증 = 월 43,200회 (공유 캐시 전제) |
| Cache Components (`use cache` + Redis) | ~43,200회 | `cacheLife("minutes")` 동일 주기 |
| Hybrid (섹션별 TTL 분리) | ~30,000 ~ 60,000회 | 섹션별 life profile에 의존, 평균치 |
| SSG (빌드 시 생성, 이 프로젝트엔 부적합) | 빌드 시 n회 | 배포 시점에만 발생, 런타임 0 |

### 4-2. origin fetch 감소가 비용에 미치는 영향

외부 API 호출 단가를 요청당 $0.0001로 가정(보수적, 실제는 $0.00002 ~ $0.002 범위)하면:

| 전략 | 월 origin 호출 비용 (가정) | 기본 인프라 비용 | **월 합계** |
| --- | --- | --- | --- |
| SSR | $100.00 | $98.31 | **$198.31** |
| ISR / Cache Components | $4.32 | $98.31 | **$102.63** |
| Hybrid | $3.00 ~ $6.00 | $98.31 | **$101.31 ~ $104.31** |

즉 **원본 API 호출 단가가 있는 도메인에서는 공유 캐시 전략 하나만으로 월 $90 이상 절감**된다. 이 숫자는 트래픽과 원본 단가에 선형 비례하므로, 월 1,000만 요청이면 $900+ 절감이 된다.

### 4-3. Redis 비용이 의미 있어지는 경계

위 표에서 `cache.t4g.micro` 1노드($16.06/월)의 본전은 **원본 API 비용 기준 약 16만 회 절감**에서 발생한다. 월 43,200회만 origin fetch를 줄여도 $4.32 절감이라 Redis 비용을 직접 상쇄하지는 못하지만, **실제 절감 효과는 "origin 호출 $비용"이 아니라 "SSR 대비 요청당 렌더 CPU 시간 단축 → ECS 태스크 증설 억제"에서 나온다**.

예를 들어 SSR만으로 월 1,000만 요청을 감당하려면 태스크를 4개로 늘려야 하는 구간이 올 수 있는데, Cache Components + Redis로는 2개로도 버틴다. 이 **태스크 1~2개 절감**이 실제 비용 방어의 핵심이다:

- 태스크 1개 증설 비용 = (0.5 vCPU × 730h × $0.05056) + (1 GB × 730h × $0.00553) = **$22.49/월**
- Redis 자체 비용 = **$16.06/월**
- → **태스크 1개 줄이는 것만으로 Redis 비용이 회수**됨

## 5. 비용이 가장 크게 변하는 요인

1. **태스크 수 (ECS desired_count)** — 선형 증가. 2→4로 가면 $44.98/월 추가.
2. **ALB 고정 비용** — 트래픽 규모와 무관하게 $19.71/월이 깔린다. 트래픽이 매우 작으면 비중이 크고, 많아지면 LCU 쪽 비중 증가.
3. **ElastiCache 노드 타입** — `cache.t4g.micro`(0.5 GB) → `cache.t4g.small`(1.4 GB)로 가면 $32.12/월, Multi-AZ까지 가면 $64.24/월 수준.
4. **원본 API 호출 단가** — 이 값이 0에 수렴하는 내부 API면 공유 캐시 절감 효과가 줄고, 유료 외부 API면 절감액이 Redis/ECS 비용을 압도한다.

## 6. 절감 포인트

1. **Hybrid 전략(섹션별 TTL 분리)**: 메인 배너 `hours`, 랭킹 `minutes`, 피드 `seconds` 식으로 나누면 평균 origin fetch 수를 낮추면서도 체감 최신성을 유지. (`docs/experiments/ssr-vs-isr-vs-cache-components.md` 참조)
2. **Redis TLS + Multi-AZ는 프로덕션 전까지 미적용**: 데모 단계에서는 Single-AZ로 충분. 프로덕션 승격 시 +$16/월 감수하고 `automatic_failover_enabled = true` 전환.
3. **CloudWatch Logs 보존 기간 단축**: 14일 → 7일로 줄이면 저장 비용 약 50% 감소. 다만 장애 회고 기간을 잃음.
4. **CloudFront + S3로 정적 자산 offload**: 이 프로젝트는 현재 ALB가 `_next/static`도 서빙하므로 데이터 전송비가 올라감. CloudFront 오리진 요금은 무료이므로 트래픽 증가 시 필수.
5. **Fargate Spot 고려**: 비용 약 70% 절감. 단, desired_count 유지를 위해 Spot + On-demand 혼합이 필요.

## 7. 결론

- 이 구성의 기본 인프라 비용은 **월 약 $98** (약 13만 원) 수준이다.
- **ECS Fargate와 ALB가 비용의 약 70%를 차지**하고, ElastiCache는 16% 정도다.
- 렌더링 전략 선택은 기본 인프라 비용을 크게 바꾸지는 않지만, **origin API 호출 비용과 태스크 수 증설 시점을 지연시키는 효과**로 실질 절감을 만든다.
- 따라서 비용 최적의 선택은 "가장 싼 전략"이 아니라 **"origin fetch를 가장 효율적으로 줄이면서 운영 복잡도를 감당할 수 있는 전략"**이다. 상세는 4편 블로그 및 `docs/experiments/ssr-vs-isr-vs-cache-components.md` 참조.
