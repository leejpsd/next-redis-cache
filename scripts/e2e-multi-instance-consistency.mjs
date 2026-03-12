function createLocalInstance(name) {
  const cache = new Map();

  return {
    name,
    read(tag, fetchSource) {
      if (cache.has(tag)) return cache.get(tag);
      const value = fetchSource();
      cache.set(tag, value);
      return value;
    },
    invalidate(tag) {
      cache.delete(tag);
    },
  };
}

function createSharedCache() {
  const cache = new Map();
  return {
    read(tag, fetchSource) {
      if (cache.has(tag)) return cache.get(tag);
      const value = fetchSource();
      cache.set(tag, value);
      return value;
    },
    invalidate(tag) {
      cache.delete(tag);
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  let sourceVersion = 1;
  const fetchSource = () => sourceVersion;

  // BEFORE: 인스턴스별 로컬 캐시 (불일치 재현)
  const localA = createLocalInstance("A");
  const localB = createLocalInstance("B");
  localA.read("random-user", fetchSource);
  localB.read("random-user", fetchSource);

  sourceVersion = 2;
  // webhook이 A 인스턴스에만 도달했다고 가정
  localA.invalidate("random-user");

  const beforeA = localA.read("random-user", fetchSource);
  const beforeB = localB.read("random-user", fetchSource);
  const beforeMismatch = beforeA !== beforeB;

  // AFTER: 공유 캐시(예: Redis) 사용
  const shared = createSharedCache();
  shared.read("random-user", fetchSource);
  shared.read("random-user", fetchSource);

  sourceVersion = 3;
  // 어떤 인스턴스가 무효화해도 공유 캐시가 비워짐
  shared.invalidate("random-user");

  const afterA = shared.read("random-user", fetchSource);
  const afterB = shared.read("random-user", fetchSource);
  const afterMismatch = afterA !== afterB;

  assert(beforeMismatch === true, "Expected mismatch in local cache mode");
  assert(afterMismatch === false, "Expected no mismatch in shared cache mode");

  const result = {
    ok: true,
    before: {
      mode: "local-per-instance-cache",
      instanceA: beforeA,
      instanceB: beforeB,
      mismatch: beforeMismatch,
    },
    after: {
      mode: "shared-cache",
      instanceA: afterA,
      instanceB: afterB,
      mismatch: afterMismatch,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (process.env.APP_BASE_URL) {
    const reportUrl = new URL("/api/metrics/consistency", process.env.APP_BASE_URL);
    await fetch(reportUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ mismatch: beforeMismatch }),
    }).catch(() => null);
    await fetch(reportUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ mismatch: afterMismatch }),
    }).catch(() => null);
  }
}

await main();
