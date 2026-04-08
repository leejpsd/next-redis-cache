import type { NextConfig } from "next";

const hasRedisUrl = Boolean(process.env.REDIS_URL);
const enableRedisCacheHandler =
  hasRedisUrl && process.env.DISABLE_REDIS_CACHE_HANDLER !== "true";

const nextConfig: NextConfig = {
  output: "standalone",
  // ISR/route cache (singular cacheHandler)와
  // Cache Components(use cache, plural cacheHandlers)를 각각 Redis로 공유한다.
  cacheHandler: enableRedisCacheHandler
    ? require.resolve("./incremental-cache-handler.js")
    : undefined,

  cacheHandlers: enableRedisCacheHandler
    ? {
        default: require.resolve("./redis-handler.cjs"),
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
