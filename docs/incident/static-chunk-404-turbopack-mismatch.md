# 프로덕션 정적 청크가 전부 404를 반환하는 문제

## 관찰 (2026-04-19, staging)

- HTML은 200으로 정상 렌더됨: `/`, `/experiments/*`, `/verify/*`
- 그러나 HTML 안에 포함된 `/_next/static/chunks/*.js`, `/_next/static/chunks/*.css`가 **전부 404**
- 브라우저에서 열면 CSR / BFF 경로의 JS가 로드되지 않아 Playwright 측정 불가
- 서버 렌더 결과(HTML) 자체는 유효하므로 k6 기반 서버 측정은 정상 진행 가능

### 샘플 청크 파일명

```
/_next/static/chunks/00o0axmbw3ktl.js
/_next/static/chunks/0fsi8lw5utejl.js
/_next/static/chunks/115dplafwys-z.js
/_next/static/chunks/turbopack-048fpmm8kyc4g.js
/_next/static/chunks/0n-52oxbrlca7.css
```

10회 반복 요청 결과: 전부 404 (두 ECS 태스크 모두 동일).

## 원인 가설

파일명 패턴(`turbopack-*`, 난수성이 강한 짧은 해시)은 **Turbopack 런타임 청크 파일명 패턴**이다.

최근 커밋 `935df71 fix: 프로덕션 빌드를 webpack으로 전환해 client chunk 404를 완화`에서 webpack 전환을 시도했으나, **HTML에 Turbopack 기준 청크 레퍼런스가 여전히 남아 있고 실제 서빙되는 `.next/static/chunks/`는 webpack 기준으로 생성되어 파일명이 어긋난다**.

가능한 지점:

1. `next.config.ts`의 turbopack 관련 설정이 프로덕션 렌더에서 여전히 참조되고 있음
2. standalone output 생성 시 Turbopack 런타임 청크 참조가 HTML 템플릿에 하드코딩되어 빌드됨
3. 빌드 파이프라인에서 Turbopack 캐시와 webpack 빌드 결과물이 섞여 들어감
4. Dockerfile에서 `.next/static`이 충분히 복사되지 않음 (runtime 청크만 누락)

## 측정에 미치는 영향

| 측정 대상 | 영향 |
| --- | --- |
| k6 (SSR/ISR/shared-cache) | 없음 — HTML 응답만 보고, 200 정상 |
| browser-strategies (CSR/BFF) | **완전 차단** — JS 로드 실패로 Playwright `waitForFunction` 타임아웃 |
| 실제 사용자 | CSR/BFF 경로는 hydration 실패로 화면은 뜨지만 인터랙티브하지 않음 |

## 후속 작업

4편 측정 완료 후 다음을 점검한다.

1. `next build --webpack` 후 `.next/standalone/server.js`로 직접 실행한 HTML과, Docker 이미지로 실행한 HTML의 청크 레퍼런스 비교
2. `next.config.ts`의 `experimental.turbo`, `turbopack` 관련 옵션 전수 제거
3. Dockerfile의 `COPY --from=builder /app/.next/static` 경로와 `.next/standalone`의 상대 경로 일치 여부
4. 해결 후 browser-strategies 재측정

## 2026-04-19 배포 후 재현 (커밋 c1d6ce2)

Hybrid 라우트 추가 배포 후에도 문제가 부분적으로 재현됨.

- `/experiments/hybrid` (신규 라우트) → webpack 청크(`?dpl=c1d6ce2...`) 정상 200
- `/experiments/csr`, `/experiments/bff` → 여전히 Turbopack 청크명 참조하는 정적 HTML 반환, 청크 전부 404

즉 **기존 CSR/BFF 페이지의 prerender된 HTML이 Turbopack 빌드 결과를 그대로 담고 있다**. 새 라우트(hybrid)만 webpack 빌드로 깨끗하게 생성된 상태.

원인 후보:

1. `app/experiments/csr/page.tsx`, `bff/page.tsx`가 `◐ Partial Prerender`로 빌드되면서 이전 Turbopack 빌드 시점의 HTML이 `.next` 캐시에 남아 재사용됨
2. Dockerfile builder 단계가 `.next` 이전 상태를 정리하지 않고 build 수행
3. Next.js build cache가 Turbopack과 webpack 모드를 구분하지 못함

해결 시도:

1. `rm -rf .next` 후 clean build하여 이미지 다시 생성
2. CSR/BFF 페이지 코드를 한 줄이라도 수정해 prerender cache 무효화
3. `next.config.ts`에서 turbopack 설정 완전 제거 확인

## 2026-04-19 3차 시도 결과 (커밋 409499b)

적용:
- Dockerfile builder 단계에 `RUN rm -rf .next` 추가
- `/dashboard`, `/experiments/hybrid` 신규 라우트 추가

결과:
- 신규 라우트는 **webpack 청크 + `?dpl=409499b...` 정상 200**
- `/experiments/csr`, `/experiments/bff`는 여전히 **Turbopack 청크명 + dpl 파라미터 없음 → 404**
- 로컬 `rm -rf .next && npm run build`는 모든 라우트가 webpack 청크로 정상 생성됨

결론: **Docker 빌드 환경(GitHub Actions Ubuntu)에서만 재현**되는 문제. 가능성:

1. GitHub Actions 이미지 레이어 캐시가 `npm run build` 결과물을 재사용 (COPY . . 이후 소스 변경이 감지되어도 build 단계의 캐시는 다시 쓸 수 있음). 실제로는 `rm -rf .next` 명령이 Docker layer로 잡혀서 builder 단계를 무효화했어야 하는데, CSR/BFF 산출물이 구 버전을 유지하는 이유는 더 깊은 곳.
2. Docker 빌드 컨텍스트에서 node_modules 안의 Turbopack 바이너리가 호출되는 경로가 존재. 예를 들어 Next CLI가 `--webpack` 플래그를 일부 산출물에만 적용하고, Partial Prerender 경로에 대해서는 내부적으로 Turbopack 결과를 재사용하는 로직이 있을 가능성.
3. `package-lock.json`의 Turbopack 네이티브 바이너리 의존성이 Docker Linux 환경에서 다르게 해석되어, `--webpack` 플래그 무시하고 Turbopack으로 빌드.

다음 조사 계획 (별도 티켓):
- GitHub Actions 빌드 로그에서 `npm run build` 실행 시 webpack/turbopack 중 어느 것이 로그에 찍히는지 확인
- Docker build를 로컬에서 수동으로 실행해 재현 여부 확인 (`docker buildx build --no-cache --load -t test-image .`)
- Next 16 GitHub issue에서 "next build --webpack ignored in Docker" 유사 리포트 검색

## 영향 범위 요약

- 서버 렌더 경로 (SSR/ISR/Cache Components/Hybrid): 전혀 영향 없음 — HTML 본문에 데이터 포함됨
- CSR/BFF: 브라우저에서 JS hydration 불가 — 기능적으로 "로딩 메시지만 보이는" 상태 유지
- 4편 블로그의 CSR/BFF LCP 수치는 **로컬 prod build (clean build) 기준**으로 이미 확보되어 있어 서술에는 영향 없음
- 대시보드(`/dashboard`)와 Hybrid는 이번 배포로 정상 노출됨

## 2026-04-20 진짜 원인 판명 (커밋 d161db5 배포 후)

응답 헤더에서 결정적 증거 발견:

```
/experiments/csr 응답:
  x-nextjs-cache: HIT
  x-nextjs-prerender: 1
  Cache-Control: s-maxage=31536000   ← 1년

/experiments/hybrid 응답 (신규 라우트):
  x-nextjs-postponed: 1
  Cache-Control: private, no-cache, no-store
```

즉 CSR/BFF/SSR/shared-cache의 문제는 **Docker 빌드가 아니라 Redis 공유 캐시 자체**였다.
`incremental-cache-handler.js`가 ISR prerender HTML을 Redis에 저장할 때 **buildId 네임스페이스를
cacheKey에 포함하지 않았다**. 그래서 새 배포가 올라가도 **이전 빌드(Turbopack으로 만들어진) HTML
이 그대로 Redis에서 hit**했고, 그 HTML이 참조하는 청크 파일은 새 이미지에 없어 404가 발생한 것.

이건 이 프로젝트가 해결하려는 "멀티 인스턴스 공유 캐시" 철학 안에서의 **배포 경계 문제**다.
공유 캐시가 너무 잘 공유되어 **배포 간에도 공유**된 것.

### 수정

`incremental-cache-handler.js`에 `BUILD_NAMESPACE` 도입:

```js
const BUILD_NAMESPACE =
  process.env.DEPLOYMENT_VERSION || process.env.GIT_HASH || "unversioned";

function entryKey(key) {
  return `${ENTRY_KEY_PREFIX}${BUILD_NAMESPACE}:${key}`;
}
```

태그 메타 키는 네임스페이스 없이 공유(revalidateTag가 배포 간에도 작동해야 함). 엔트리만 분리.

### 검증 방법

배포 후 다음 확인:

1. `/experiments/csr` 응답의 청크 파일명이 webpack 패턴(`4bd1b696-*.js` 등)으로 바뀌는지
2. 모든 청크 요청이 200인지
3. `/api/cache-debug`에서 `next-incremental:entry:<git-sha>:*` 패턴의 키가 새로 생기는지

### 블로그 4편에 반영할 가치

이 이슈 자체가 4편의 좋은 반례가 된다 — "공유 캐시는 멀티 인스턴스에는 축복이지만 배포 경계에서는
저주가 될 수 있다. cacheKey 네임스페이스를 배포 ID로 분리해야 한다." 운영 경험으로 추가할 만함.

## 4편 서술 계획

CSR/BFF 비교는 **이전 측정 (2026-04-14) 결과**를 그대로 인용하되, "이번 운영 검증 중 발견한 deployment skew 형태의 실제 사례"로 이 인시던트 자체를 서술한다. 4편의 "일관성 vs 속도" 주제와 자연스럽게 연결된다.
