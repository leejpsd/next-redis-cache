import path from "path";
import type { NextConfig } from "next";

const hasRedisUrl = Boolean(process.env.REDIS_URL);
const enableRedisCacheHandler =
  hasRedisUrl && process.env.DISABLE_REDIS_CACHE_HANDLER !== "true";

// next.config.ts is evaluated at *build* time. A direct `useLibraryHandler =
// process.env.USE_LIBRARY_HANDLER === "true"` here would pick a path once
// during the Docker build (where the env is unset) and bake that resolved
// absolute path into the standalone server, defeating any runtime override.
//
// We delegate the actual choice to small router modules that read the env
// at *request* time. next.config.ts only needs to point Next.js at those
// routers; the routers point Next.js at the right backend handler.
const incrementalHandlerPath = "./incremental-router.cjs";
const cacheComponentsHandlerPath = "./cache-components-router.cjs";

const nextConfig: NextConfig = {
  output: "standalone",
  // 부모 디렉토리에 lockfile이 있어도 항상 프로젝트 폴더를 workspace root로 고정한다.
  // 그렇지 않으면 standalone 빌드의 정적 파일 추적 경로가 어긋나 일부 청크가 누락돼
  // 운영에서 chunk 404가 발생할 수 있다.
  outputFileTracingRoot: path.join(__dirname),
  // Next.js standalone 빌드는 next.config 평가 시점에 require.resolve로 잡힌
  // 파일만 trace한다. USE_LIBRARY_HANDLER 토글은 빌드 시점에는 보통 false라
  // 라이브러리 wrapper와 npm 패키지가 standalone 디렉토리에 누락된다. 결과적으로
  // 런타임에 USE_LIBRARY_HANDLER=true 로 켜도 파일이 없어 Next.js 기본 LRU로
  // 무성한 fallback이 발생한다. 명시적으로 trace에 포함시켜 차단한다.
  outputFileTracingIncludes: {
    "/**/*": [
      // Routers (runtime toggle entry points)
      "./incremental-router.cjs",
      "./cache-components-router.cjs",
      // Library wrappers (resolved by routers when USE_LIBRARY_HANDLER=true)
      "./lib-cache-components.cjs",
      "./lib-incremental-cache-handler.cjs",
      // In-tree handlers (resolved by routers when USE_LIBRARY_HANDLER=false)
      "./incremental-cache-handler.js",
      "./redis-handler.cjs",
      // Library npm package
      "./node_modules/@leejpsd/nextjs-cache-handler/**/*",
    ],
  },
  deploymentId: process.env.DEPLOYMENT_VERSION,
  generateBuildId: async () =>
    process.env.DEPLOYMENT_VERSION || process.env.GIT_HASH || "dev-build",
  // ISR/route cache (singular cacheHandler)와
  // Cache Components(use cache, plural cacheHandlers)를 각각 Redis로 공유한다.
  cacheHandler: enableRedisCacheHandler
    ? require.resolve(incrementalHandlerPath)
    : undefined,

  cacheHandlers: enableRedisCacheHandler
    ? {
        default: require.resolve(cacheComponentsHandlerPath),
      }
    : {},

  // 멀티 인스턴스에서 로컬 메모리 캐시가 엇갈리지 않도록 기본 메모리 캐시는 끈다.
  cacheMaxMemorySize: 0,
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/portraits/**",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
export default nextConfig;
