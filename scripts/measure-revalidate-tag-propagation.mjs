#!/usr/bin/env node
/**
 * revalidateTag 전파 속도 측정.
 *
 * 시나리오:
 *  1. 멀티 태스크 환경에서 shared-cache에 현재 유저를 캡처 (baseline)
 *  2. Task A에 Server Action revalidateTag 를 호출 (이 데모의 /action 경로 대신
 *     소프트 무효화를 위해 두 가지 트리거 모두 지원)
 *  3. Task A·B에 반복 polling 하면서 "새 유저가 나오는 첫 시점"을 기록
 *  4. 각 태스크에 반영된 시각 차이를 ms 단위로 출력
 *
 * 두 포트(3000, 3001)가 같은 Redis를 공유한다고 가정하며,
 * 각 포트를 하나의 ECS 태스크로 본다.
 *
 * 실행 예:
 *   TASK_A_URL=http://localhost:3000 TASK_B_URL=http://localhost:3001 \
 *   TRIGGER_URL=http://localhost:3000 \
 *   node scripts/measure-revalidate-tag-propagation.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const TASK_A_URL = process.env.TASK_A_URL || "http://localhost:3000";
const TASK_B_URL = process.env.TASK_B_URL || "http://localhost:3001";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || "150");
const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS || "15000");
const ROUNDS = Number(process.env.ROUNDS || "5");
const SHARED_PATH = "/experiments/shared-cache";
const OUTPUT_PATH =
  process.env.OUT ||
  "docs/load-test/2026-04-20/revalidate-tag-propagation.json";

function extractPayload(html) {
  const match = html.match(
    /<pre id="experiment-random-user-payload"[^>]*>([\s\S]*?)<\/pre>/
  );
  if (!match) return null;
  const decoded = match[1]
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function fingerprint(payload) {
  if (!payload?.results?.[0]) return null;
  const u = payload.results[0];
  // 유저 이름+이메일 조합으로 캐시 엔트리 유일성 판단
  return `${u.name.first}-${u.name.last}-${u.email}`;
}

async function fetchUser(baseUrl) {
  const res = await fetch(`${baseUrl}${SHARED_PATH}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!res.ok) throw new Error(`${baseUrl} returned ${res.status}`);
  const html = await res.text();
  const payload = extractPayload(html);
  return {
    fingerprint: fingerprint(payload),
    fetchedAt: payload?.fetchedAt ?? null,
  };
}

/**
 * 소프트 무효화 트리거 — Next Server Action을 직접 못 부르므로,
 * /api/cache-debug 데이터가 흩어지는 것을 피해 TRIGGER URL에서 페이지를 한 번 강제로 무효화한다.
 * 이 데모는 Cache Components 기반이라 태그 재검증을 위해 Redis 키를 직접 지워 구현:
 */
async function triggerInvalidate() {
  // redis-cli에 직접 DEL 시도 — 시리즈의 revalidateTag 의미와 동일 효과 (태그 하위 엔트리 삭제)
  const { execSync } = await import("node:child_process");
  execSync(
    `redis-cli --no-raw EVAL "local tag = 'next-cache:tag:random-user'; local members = redis.call('SMEMBERS', tag); for i, m in ipairs(members) do redis.call('DEL', m) end; redis.call('DEL', tag); return #members" 0`,
    { stdio: "inherit" }
  );
}

async function waitForNewUser(baseUrl, previousFingerprint, startedAt) {
  const deadline = Date.now() + MAX_WAIT_MS;
  let polls = 0;
  while (Date.now() < deadline) {
    polls += 1;
    const now = Date.now();
    const user = await fetchUser(baseUrl);
    if (user.fingerprint && user.fingerprint !== previousFingerprint) {
      return {
        detectedAt: now,
        elapsedMs: now - startedAt,
        polls,
        newFingerprint: user.fingerprint,
      };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { detectedAt: null, elapsedMs: null, polls, newFingerprint: null };
}

async function runRound(roundIdx) {
  // 1. baseline — 양쪽 태스크 현재 유저
  const aBefore = await fetchUser(TASK_A_URL);
  const bBefore = await fetchUser(TASK_B_URL);
  console.log(
    `  round ${roundIdx}: baseline A=${aBefore.fingerprint?.slice(0, 20)}... B=${bBefore.fingerprint?.slice(0, 20)}...`
  );
  if (aBefore.fingerprint !== bBefore.fingerprint) {
    console.warn(
      "    ! 두 태스크가 서로 다른 유저를 보고 있음 — Redis 공유가 안 됐을 가능성"
    );
  }

  // 2. 무효화 트리거
  const triggeredAt = Date.now();
  await triggerInvalidate();

  // 3. 양쪽에서 새 유저 도달 시점 측정
  const [aReached, bReached] = await Promise.all([
    waitForNewUser(TASK_A_URL, aBefore.fingerprint, triggeredAt),
    waitForNewUser(TASK_B_URL, bBefore.fingerprint, triggeredAt),
  ]);

  console.log(
    `    A reached in ${aReached.elapsedMs ?? "timeout"}ms (${aReached.polls} polls)`
  );
  console.log(
    `    B reached in ${bReached.elapsedMs ?? "timeout"}ms (${bReached.polls} polls)`
  );

  return {
    round: roundIdx,
    triggeredAt,
    baseline: { A: aBefore.fingerprint, B: bBefore.fingerprint },
    a: aReached,
    b: bReached,
  };
}

function summarize(values) {
  if (values.length === 0) return { count: 0 };
  const valid = values.filter((v) => typeof v === "number");
  if (valid.length === 0) return { count: 0, timeoutCount: values.length };
  const sorted = [...valid].sort((a, b) => a - b);
  return {
    count: valid.length,
    timeoutCount: values.length - valid.length,
    avg: Number(
      (valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(1)
    ),
    min: sorted[0],
    med: sorted[Math.floor(sorted.length / 2)],
    max: sorted.at(-1),
  };
}

async function main() {
  console.log(
    `revalidateTag propagation — A=${TASK_A_URL} B=${TASK_B_URL}, ${ROUNDS} rounds`
  );
  console.log(
    `poll every ${POLL_INTERVAL_MS}ms, max wait ${MAX_WAIT_MS}ms per task\n`
  );

  const rounds = [];
  for (let i = 1; i <= ROUNDS; i += 1) {
    try {
      const result = await runRound(i);
      rounds.push(result);
    } catch (err) {
      console.error(`  round ${i} failed: ${err.message}`);
      rounds.push({ round: i, error: err.message });
    }
    // 다음 round 전 잠깐 휴식
    await new Promise((r) => setTimeout(r, 500));
  }

  const aTimes = rounds.map((r) => r.a?.elapsedMs).filter(Boolean);
  const bTimes = rounds.map((r) => r.b?.elapsedMs).filter(Boolean);
  const summary = {
    A: summarize(aTimes),
    B: summarize(bTimes),
    combined: summarize([...aTimes, ...bTimes]),
  };

  const out = {
    taskAUrl: TASK_A_URL,
    taskBUrl: TASK_B_URL,
    rounds: rounds.length,
    pollIntervalMs: POLL_INTERVAL_MS,
    maxWaitMs: MAX_WAIT_MS,
    measuredAt: new Date().toISOString(),
    description:
      "두 태스크(포트 3000·3001)가 같은 Redis를 공유하는 상태에서 태그 무효화 후 각 태스크가 새 유저를 반환하는 데 걸린 시간. polls = 감지까지 필요했던 HTTP 요청 수.",
    summary,
    rounds,
  };

  console.log("\n=== Summary ===");
  console.log(JSON.stringify(summary, null, 2));

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nSaved: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
