import type { NextConfig } from "next";

const hasRedisUrl = Boolean(process.env.REDIS_URL);

const nextConfig: NextConfig = {
  output: "standalone",
  // 여기서 Redis 핸들러를 default 또는 remote에 붙임
  cacheHandlers: hasRedisUrl
    ? {
        // 전체 서버 캐시를 Redis로 공유하고 싶다면:
        default: require.resolve("./redis-handler.cjs"),

        // 혹은 'use cache: remote' 전용으로만 쓰고 싶으면 remote에만 등록하고,
        // default는 기존 in-memory 그대로 둬도 됨.
        // remote: require.resolve("./redis-handler.cjs"),
      }
    : {},

  // 기본 파일시스템/메모리 캐시를 0으로 꺼버려야
  // 모든 캐시가 Redis로만 가게 됨
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
