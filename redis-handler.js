/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("redis");

const client = createClient({
  url: "redis://localhost:6379",
  // 실제론 환경변수 를 사용
});

client.on("error", (err) => {
  console.error("[Redis CacheHandler] Redis error:", err);
});

if (!client.isOpen) {
  client.connect().catch((err) => {
    console.error("[Redis CacheHandler] Failed to connect:", err);
  });
}

// 태그 → 키 목록을 저장할 Redis key prefix
const TAG_KEY_PREFIX = "next-cache:tag:"; // 예: next-cache:tag:posts
const ENTRY_KEY_PREFIX = "next-cache:entry:"; // 예: next-cache:entry:<cacheKey>

function entryKey(cacheKey) {
  return `${ENTRY_KEY_PREFIX}${cacheKey}`;
}

function tagKey(tag) {
  return `${TAG_KEY_PREFIX}${tag}`;
}

module.exports = {
  // cacheHandlers.get
  async get(cacheKey, softTags) {
    const redisKey = entryKey(cacheKey);

    const stored = await client.get(redisKey);
    if (!stored) return undefined;

    const data = JSON.parse(stored);

    // revalidate 시간 지난 건 여기서 버리기 (선택 사항)
    const now = Date.now();
    if (now > data.timestamp + data.revalidate * 1000) {
      // 만료된 경우 Redis에서도 같이 지워준다
      await client.del(redisKey);
      return undefined;
    }

    // Redis에 base64로 저장했던 byte들을 다시 ReadableStream으로 복원
    return {
      value: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from(data.value, "base64"));
          controller.close();
        },
      }),
      tags: data.tags,
      stale: data.stale,
      timestamp: data.timestamp,
      expire: data.expire,
      revalidate: data.revalidate,
    };
  },

  // cacheHandlers.set
  async set(cacheKey, pendingEntry) {
    const entry = await pendingEntry;

    // 캐시 value(ReadbleStream)를 전부 읽어서 byte 배열로 만든다
    const reader = entry.value.getReader();
    const chunks = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

    const redisKey = entryKey(cacheKey);

    // 1) 엔트리 본문 저장
    await client.set(
      redisKey,
      JSON.stringify({
        value: buffer.toString("base64"),
        tags: entry.tags,
        stale: entry.stale,
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
      }),
      {
        EX: entry.expire || entry.revalidate || 60 * 60, // expire가 0이면 fallback
      }
    );

    // 2) 태그 인덱스 업데이트
    //    tag:posts -> [redisKey1, redisKey2, ...]
    if (Array.isArray(entry.tags)) {
      for (const tag of entry.tags) {
        if (!tag) continue;
        await client.sAdd(tagKey(tag), redisKey);
      }
    }
  },

  // 보통은 no-op
  async refreshTags() {
    // 여러 인스턴스 + 별도 태그 서비스 쓸 때만 로직이 필요함.
    // 우리는 Redis 하나를 single source로 쓰니까 여기선 아무 것도 안 해도 됨.
  },

  // 태그별 만료 타임스탬프를 따로 안 관리할 거면 0을 리턴
  async getExpiration(tags) {
    // 필요하다면: 태그별 "마지막 revalidate 시각"을 Redis에 저장해두고
    // 여기서 Math.max(...)로 계산해서 리턴 가능.
    return 0;
  },

  // ✅ revalidateTag / updateTag 호출 시 내부적으로 여기로 들어온다고 보면 됨
  async updateTags(tags, durations) {
    if (!Array.isArray(tags) || tags.length === 0) return;

    // 각 태그에 대한 엔트리 키들을 찾아서 모두 삭제
    for (const tag of tags) {
      const tKey = tagKey(tag);

      const entryKeys = await client.sMembers(tKey);
      if (entryKeys.length > 0) {
        // 엔트리 삭제
        await client.del(entryKeys);
      }

      // 태그 세트 자체도 정리
      await client.del(tKey);
    }

    // durations?.expire 를 이용해서
    // "태그를 지금 바로 삭제하지 않고, n초 뒤에 만료" 같은 패턴도 구현 가능
  },
};
