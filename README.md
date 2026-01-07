# 🚀 Next.js 16 + Redis Cache Demo

Next.js 16의 **Cache Components** + **cacheHandlers**를 활용해 Redis에 통합 데이터 캐시를 구축하는 데모 프로젝트입니다.

> AWS Self-hosting 환경에서 다중 인스턴스 간 캐시 불일치 문제를 해결하는 패턴을 다룹니다.

![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![Redis](https://img.shields.io/badge/Redis-5.10.0-DC382D?logo=redis)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

---

## 📋 목차

- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [핵심 개념](#-핵심-개념)
- [캐시 무효화 패턴](#-캐시-무효화-패턴)
- [API 엔드포인트](#-api-엔드포인트)
- [Redis 키 구조](#-redis-키-구조)
- [주의사항](#-주의사항)
- [트러블슈팅](#-트러블슈팅)
- [참고 자료](#-참고-자료)

---

## 🎯 개요

### 문제 상황

Next.js를 AWS + ALB + EC2 다중 인스턴스 환경에서 Self-hosting할 때:

```
            [Client]
               ↓
        [ALB (로드 밸런서)]
   ↓           ↓           ↓
[EC2 #1]   [EC2 #2]   [EC2 #3]
(Next.js)  (Next.js)  (Next.js)
  캐시A      캐시B      캐시C    ← 각자 다른 캐시!
```

- 기존 Data Cache/ISR은 인스턴스별 로컬 저장소(파일시스템/메모리)에 저장
- Webhook으로 `revalidateTag`를 호출해도 한 인스턴스만 무효화
- 유저마다 다른 데이터를 보게 되는 문제 발생

### 해결 방안

```
            [Client]
               ↓
        [ALB (로드 밸런서)]
   ↓           ↓           ↓
[EC2 #1]   [EC2 #2]   [EC2 #3]
(Next.js)  (Next.js)  (Next.js)
    ↘          ↓          ↙
         [Redis] ← 단일 캐시 저장소!
```

- Next.js 16의 `cacheHandlers`로 Cache Components 계층을 Redis에 연결
- 모든 인스턴스가 같은 Redis를 바라보므로 캐시 일관성 보장

---

## ✨ 주요 기능

- ✅ **Redis 기반 통합 캐시** - `use cache` + `cacheHandlers`로 Redis에 캐시 저장
- ✅ **태그 기반 캐시 관리** - `cacheTag`로 태그 지정, `revalidateTag`로 무효화
- ✅ **Soft Stale vs Hard Stale** - 두 가지 캐시 무효화 전략 데모
- ✅ **Webhook 시뮬레이션** - 외부 시스템에서 캐시 무효화 트리거
- ✅ **실시간 캐시 상태 UI** - FRESH / STALE / HARD 상태 시각화

---

## 🛠 기술 스택

| 구분      | 기술               | 버전   |
| --------- | ------------------ | ------ |
| Framework | Next.js            | 16.0.3 |
| Runtime   | React              | 19.2.0 |
| Language  | TypeScript         | 5.x    |
| Cache     | Redis (node-redis) | 5.10.0 |
| Styling   | Tailwind CSS       | 4.x    |
| Container | Docker             | -      |

---

## 🚀 시작하기

### 1. 사전 요구사항

- Node.js 20.9+
- Docker Desktop
- pnpm / npm / yarn

### 2. Docker Desktop 설치

Redis를 로컬에서 쉽게 실행하기 위해 Docker를 사용합니다.

#### macOS

```bash
# Homebrew로 설치 (권장)
brew install --cask docker

# 또는 공식 사이트에서 다운로드
# https://www.docker.com/products/docker-desktop/
```

설치 후 **Docker Desktop 앱을 실행**해주세요. 메뉴바에 🐳 고래 아이콘이 보이면 준비 완료!

#### Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) 다운로드
2. 설치 파일 실행 후 안내에 따라 설치
3. **WSL 2 설치가 필요**할 수 있어요 - 설치 중 안내가 나오면 따라하세요
4. 설치 완료 후 Docker Desktop 실행
5. 시스템 트레이에 🐳 고래 아이콘이 보이면 준비 완료!

#### 설치 확인

터미널(또는 PowerShell)에서 아래 명령어로 설치가 잘 됐는지 확인:

```bash
docker --version
# Docker version 24.x.x, build xxxxx 같은 출력이 나오면 성공!
```

> 💡 **Tip**: Docker Desktop이 실행 중이어야 `docker` 명령어가 동작해요!
> 고래 아이콘이 "Docker Desktop is running" 상태인지 확인하세요.

### 3. Redis 실행

```bash
# Redis 컨테이너 실행
docker run --name next-redis -p 6379:6379 -d redis

# 실행 확인
docker ps

# Redis CLI 접속 (선택)
docker exec -it next-redis redis-cli
```

> 🔄 **재시작 시**: 컴퓨터를 껐다 켜면 Redis 컨테이너도 멈춰요.
> `docker start next-redis` 명령어로 다시 시작할 수 있어요.

### 4. 프로젝트 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 5. 접속

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 📁 프로젝트 구조

```
next-redis-cache-demo/
├── app/
│   ├── action/
│   │   └── actions.ts              # Server Actions (캐시 무효화)
│   ├── api/
│   │   └── revalidate/
│   │       ├── actions.ts          # Webhook 핸들러 로직
│   │       └── route.ts            # Route Handler (POST)
│   ├── components/
│   │   ├── CacheControls.tsx       # 캐시 컨트롤 패널 (Client Component)
│   │   └── UserProfile.tsx         # 유저 프로필 카드 (Server Component)
│   ├── lib/
│   │   └── getRandomUser.ts        # "use cache" 적용된 데이터 fetcher
│   ├── globals.css                 # Tailwind CSS
│   ├── layout.tsx                  # Root Layout
│   └── page.tsx                    # 메인 페이지
├── public/                         # 정적 파일
├── redis-handler.js                # Redis CacheHandler 구현
├── next.config.ts                  # Next.js 설정 (cacheHandlers)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 💡 핵심 개념

### Cache Components vs 기존 Data Cache

| 구분          | 기존 Data Cache/ISR               | Cache Components                  |
| ------------- | --------------------------------- | --------------------------------- |
| 활성화        | 기본 활성화                       | `cacheComponents: true`           |
| 저장소        | 로컬 파일시스템/메모리            | 인메모리 LRU → **Redis (커스텀)** |
| 태그 지정     | `fetch({ next: { tags } })`       | `cacheTag()`                      |
| 수명 설정     | `fetch({ next: { revalidate } })` | `cacheLife()`                     |
| 커스텀 핸들러 | `cacheHandler` (단수)             | `cacheHandlers` (복수)            |

### use cache 사용법

```ts
// app/lib/getRandomUser.ts
import { cacheTag } from "next/cache";

export async function getRandomUser() {
  "use cache"; // Cache Components 계층 진입

  cacheTag("random-user"); // 태그 지정

  const res = await fetch("https://randomuser.me/api", {
    next: { revalidate: 3600, tags: ["posts"] },
  });

  return { ...(await res.json()), fetchedAt: Date.now() };
}
```

### next.config.ts 설정

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true, // Cache Components 활성화

  cacheHandlers: {
    default: require.resolve("./redis-handler.js"), // Redis 핸들러
  },

  cacheMaxMemorySize: 0, // 인메모리 캐시 비활성화

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/portraits/**",
      },
    ],
  },
};

export default nextConfig;
```

### Redis CacheHandler 인터페이스

```js
// redis-handler.js
module.exports = {
  async get(cacheKey, softTags) { ... },       // 캐시 조회
  async set(cacheKey, pendingEntry) { ... },   // 캐시 저장
  async refreshTags() { ... },                 // 태그 새로고침 (no-op)
  async getExpiration(tags) { ... },           // 태그 만료 시간 조회
  async updateTags(tags, durations) { ... },   // 태그 기반 무효화
};
```

---

## 🔄 캐시 무효화 패턴

### 1. Soft Stale (SWR) - Server Action

```ts
// app/action/actions.ts
"use server";
import { revalidateTag } from "next/cache";

export async function invalidateRandomUser() {
  revalidateTag("random-user", "max"); // Soft Stale
}
```

- 기존 캐시를 stale 처리
- 다음 요청 시 기존 캐시를 먼저 반환하면서 백그라운드에서 갱신
- **사용처**: 약간의 지연이 허용되는 콘텐츠

### 2. Hard Stale (즉시 만료) - Webhook

```ts
// app/api/revalidate/actions.ts
import { revalidateTag } from "next/cache";

export async function handleWebhook(req: NextRequest) {
  // ... 인증 로직

  revalidateTag("random-user", { expire: 0 }); // Hard Stale (즉시 만료)

  return NextResponse.json({ revalidated: true });
}
```

- 캐시 즉시 삭제
- 다음 요청 시 새 데이터를 fetch할 때까지 대기
- **사용처**: Webhook, 외부 시스템 연동

### 비교표

| 함수                                | 호출 위치                    | 동작             | 사용 시나리오        |
| ----------------------------------- | ---------------------------- | ---------------- | -------------------- |
| `revalidateTag(tag, "max")`         | Server Action, Route Handler | Soft Stale (SWR) | 콘텐츠 업데이트      |
| `revalidateTag(tag, { expire: 0 })` | Server Action, Route Handler | Hard Stale       | Webhook              |
| `updateTag(tag)`                    | **Server Action 전용**       | 즉시 만료 + 대기 | 폼 저장 후 즉시 반영 |

> ⚠️ **주의**: `updateTag`는 Server Action 내에서만 사용 가능합니다.
> Route Handler에서 호출하면 에러가 발생해요!

---

## 🔌 API 엔드포인트

### POST /api/revalidate

외부 시스템(CMS, Webhook 등)에서 캐시를 무효화할 때 사용합니다.

**Request:**

```bash
curl -X POST "http://localhost:3000/api/revalidate?secret=eddy-test" \
  -H "topic: random-user/create"
```

**Headers:**

| 헤더    | 값                   | 설명                               |
| ------- | -------------------- | ---------------------------------- |
| `topic` | `random-user/create` | 무효화 대상 (create/update/delete) |

**Query Parameters:**

| 파라미터 | 값          | 설명                               |
| -------- | ----------- | ---------------------------------- |
| `secret` | `eddy-test` | 인증 시크릿 (환경변수로 관리 권장) |

**Response:**

```json
{
  "status": 202,
  "revalidated": true,
  "tag": "random-user",
  "now": 1704067200000
}
```

**지원하는 topic:**

- `random-user/create`
- `random-user/update`
- `random-user/delete`

---

## 🗄 Redis 키 구조

### 캐시 엔트리

```
next-cache:entry:<cacheKey>
```

저장 형식 (JSON):

```json
{
  "value": "<base64 encoded data>",
  "tags": ["random-user"],
  "stale": 300,
  "timestamp": 1704067200000,
  "expire": 3600,
  "revalidate": 900
}
```

### 태그 인덱스

```
next-cache:tag:<tagName>
```

타입: Redis Set  
값: 해당 태그와 연결된 엔트리 키 목록

### Redis CLI로 확인

```bash
# 저장된 키 개수
127.0.0.1:6379> DBSIZE

# 키 목록 조회
127.0.0.1:6379> SCAN 0 COUNT 10

# 특정 태그의 엔트리들
127.0.0.1:6379> SMEMBERS next-cache:tag:random-user

# 캐시 엔트리 내용
127.0.0.1:6379> GET "next-cache:entry:..."

# 전체 초기화
127.0.0.1:6379> FLUSHDB
```

---

## ⚠️ 주의사항

### Soft Stale vs Hard Stale 구현에 대해

현재 데모의 CacheHandler는 **Next.js 공식 예제와 동일하게** 구현되어 있습니다.

```js
// redis-handler.js - updateTags
async updateTags(tags, durations) {
  // durations 파라미터가 있지만, 공식 예제처럼 그냥 삭제
  await client.del(entryKeys);
}
```

따라서 `revalidateTag("tag", "max")`와 `revalidateTag("tag", { expire: 0 })` **모두 캐시를 즉시 삭제**합니다.

**실제 Soft Stale(stale-while-revalidate) 동작**을 구현하려면:

1. `durations` 파라미터를 확인하고
2. 삭제 대신 stale timestamp를 기록한 뒤
3. `get()`에서 stale 상태면 기존 값 반환 + 백그라운드 갱신

이 로직을 CacheHandler에서 직접 구현해야 합니다. Next.js가 자동으로 해주는 것이 아닙니다.

> 💡 데모에서는 개념 이해에 초점을 맞췄으며, 프로덕션 레벨 구현은 추후 다룰 예정입니다.

### 환경변수

프로덕션 환경에서는 환경변수를 사용하세요:

```env
# .env.local
REDIS_URL=redis://localhost:6379
REVALIDATION_SECRET=your-secret-key
```

```js
// redis-handler.js
const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
```

---

## 🔧 트러블슈팅

### Redis 연결 실패

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**해결:**

```bash
# Redis 컨테이너 상태 확인
docker ps -a

# 컨테이너가 없다면 다시 실행
docker run --name next-redis -p 6379:6379 -d redis

# 컨테이너가 멈춰있다면 재시작
docker start next-redis
```

### 캐시가 적용되지 않음

1. `next.config.ts`에 `cacheComponents: true` 확인
2. 함수 최상단에 `"use cache"` directive 확인
3. `cacheTag()`로 태그가 지정되어 있는지 확인
4. Redis CLI에서 키가 생성되는지 확인

### updateTag가 동작하지 않음

```
Error: updateTag can only be called from within a Server Action
```

**해결:** Route Handler에서는 `updateTag` 대신 `revalidateTag(tag, { expire: 0 })` 사용

### TypeScript 에러

```ts
// revalidateTag 두 번째 인자 필수 (Next.js 16)
revalidateTag("tag"); // ❌ deprecated
revalidateTag("tag", "max"); // ✅
```

---

## 📚 참고 자료

### 공식 문서

- [Next.js - Cache Components](https://nextjs.org/docs/app/getting-started/cache-components)
- [Next.js - cacheHandlers](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers)
- [Next.js - use cache directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Next.js - revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Next.js - updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [Next.js - cacheTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [Next.js - cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife)

### 블로그 시리즈

- [Next.js 16 + Redis | AWS Self-hosting 캐시 불일치 해결하기 (1편 · 개념)](https://velog.io/@leejpsd/Next.js-16-Redis-AWS-Self-hosting-캐시-불일치-해결하기-1편-개념)
- [Next.js 16 + Redis | AWS Self-hosting 캐시 불일치 해결하기 (2편 · 구현)](https://velog.io/@leejpsd/Next.js-16-Redis-AWS-Self-hosting-캐시-불일치-해결하기-2편-구현)

---

## 📜 스크립트

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버
npm start

# 린트
npm run lint
```

---

## 👤 Author

**Eddy Lee**

- 블로그: https://velog.io/@leejpsd/posts
- 이메일: leejpsd@gmail.com
