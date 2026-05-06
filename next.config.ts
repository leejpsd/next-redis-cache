import path from "path";
import type { NextConfig } from "next";

const hasRedisUrl = Boolean(process.env.REDIS_URL);
const enableRedisCacheHandler =
  hasRedisUrl && process.env.DISABLE_REDIS_CACHE_HANDLER !== "true";

// Dogfood toggle: when USE_LIBRARY_HANDLER=true, route both handlers through
// @leejpsd/nextjs-cache-handler instead of the in-tree implementations. Lets
// us validate the published library on real staging before cutting v0.1.0
// and gives one-env-var rollback if anything regresses.
const useLibraryHandler = process.env.USE_LIBRARY_HANDLER === "true";

const incrementalHandlerPath = useLibraryHandler
  ? "./lib-incremental-cache-handler.cjs"
  : "./incremental-cache-handler.js";
const cacheComponentsHandlerPath = useLibraryHandler
  ? "./lib-cache-components.cjs"
  : "./redis-handler.cjs";

const nextConfig: NextConfig = {
  output: "standalone",
  // 부모 디렉토리에 lockfile이 있어도 항상 프로젝트 폴더를 workspace root로 고정한다.
  // 그렇지 않으면 standalone 빌드의 정적 파일 추적 경로가 어긋나 일부 청크가 누락돼
  // 운영에서 chunk 404가 발생할 수 있다.
  outputFileTracingRoot: path.join(__dirname),
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
