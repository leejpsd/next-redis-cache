/**
 * revalidateTag 전파 속도 실측 카드.
 * docs/load-test/2026-04-20/revalidate-tag-propagation.json 기반.
 * 두 태스크(3000/3001)가 같은 Redis를 공유하는 상태에서
 * 태그 무효화 후 각 태스크가 새 값을 반환하는 데 걸린 시간.
 */

const ROUNDS = [
  { r: 1, a: 10, b: 10 },
  { r: 2, a: 6, b: 6 },
  { r: 3, a: 5, b: 5 },
  { r: 4, a: 6, b: 6 },
  { r: 5, a: 5, b: 5 },
];

const SUMMARY = {
  avg: 6.4,
  median: 6,
  min: 5,
  max: 10,
  abSkew: 0, // A/B 편차
  pollSuccessRate: "5/5 round, 첫 polling 내 감지",
  rounds: 5,
  pollIntervalMs: 100,
  maxWaitMs: 15000,
};

const CHART_MAX_MS = 20; // 시각화 상한 (실제 max는 10ms라 여유)

export function PropagationCard() {
  return (
    <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">공유 캐시 일관성 · 실측</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            무효화 전파는 <span className="metric-number text-emerald-800">6.4ms</span> —
            두 태스크가 사실상 동시에 바뀐다
          </h2>
        </div>
        <span className="rounded-full border border-stone-300/80 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          {SUMMARY.rounds} rounds · poll {SUMMARY.pollIntervalMs}ms
        </span>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        두 개의 Next 태스크(포트 3000 · 3001)가 같은 Redis를 공유할 때, 한쪽에서
        태그를 무효화하면 다른 태스크가 언제 새 값을 반환하는지 측정했습니다.
        이 시리즈의 핵심 주장{" "}
        <span className="text-emerald-800">
          &ldquo;멀티 인스턴스에서도 같은 캐시 상태를 본다&rdquo;
        </span>
        의 가장 직접적인 실측 증거.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* 좌측: 대형 수치 + A/B 편차 */}
        <div className="rounded-2xl border border-emerald-700/15 bg-emerald-900/5 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-800">
            A · B 평균 전파 시간
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span
              className="metric-number text-6xl font-semibold text-emerald-800"
              style={{ textShadow: "0 0 24px rgba(0, 220, 130, 0.45)" }}
            >
              {SUMMARY.avg}
            </span>
            <span className="text-xs text-stone-500">ms</span>
          </div>
          <dl className="mt-4 space-y-1.5 text-[11px] text-stone-500">
            <div className="flex justify-between">
              <dt>median</dt>
              <dd className="metric-number text-stone-100">{SUMMARY.median}ms</dd>
            </div>
            <div className="flex justify-between">
              <dt>min / max</dt>
              <dd className="metric-number text-stone-100">
                {SUMMARY.min} / {SUMMARY.max}ms
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>A / B 편차</dt>
              <dd className="metric-number text-stone-100">
                {SUMMARY.abSkew}ms (동일)
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>성공률</dt>
              <dd className="metric-number text-stone-100">
                {SUMMARY.pollSuccessRate}
              </dd>
            </div>
          </dl>
        </div>

        {/* 우측: 라운드별 바 */}
        <div className="rounded-2xl border border-stone-300/80 bg-white/5 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
            라운드별 전파 시간 (A · B)
          </p>
          <div className="mt-4 space-y-3">
            {ROUNDS.map((row) => {
              const aPct = (row.a / CHART_MAX_MS) * 100;
              const bPct = (row.b / CHART_MAX_MS) * 100;
              return (
                <div key={row.r}>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>round {row.r}</span>
                    <span className="metric-number text-stone-100">
                      A {row.a}ms · B {row.b}ms
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <div className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-white/5 ring-1 ring-stone-300/80">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${aPct}%`,
                          background: "#00dc82",
                          boxShadow: "0 0 8px rgba(0, 220, 130, 0.45)",
                        }}
                      />
                    </div>
                    <div className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-white/5 ring-1 ring-stone-300/80">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${bPct}%`,
                          background: "#3291ff",
                          boxShadow: "0 0 8px rgba(50, 145, 255, 0.45)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-stone-500">
            <span>
              <span
                className="mr-1 inline-block h-1.5 w-3 rounded-full align-middle"
                style={{ background: "#00dc82" }}
              />
              Task A (3000)
            </span>
            <span>
              <span
                className="mr-1 inline-block h-1.5 w-3 rounded-full align-middle"
                style={{ background: "#3291ff" }}
              />
              Task B (3001)
            </span>
          </div>
        </div>
      </div>

      <p className="mt-5 border-t border-stone-300/80 pt-3 text-xs leading-5 text-stone-500">
        편차가 0이라는 건 두 태스크 중 어느 쪽으로 요청이 가도{" "}
        <span className="text-emerald-800">같은 시점에 새 데이터를 본다</span>는
        뜻. 3편의 핵심 문제(&ldquo;EC2 #1은 최신 / EC2 #2는 옛날&rdquo;)가 실측으로
        0ms까지 좁혀졌다.
      </p>
    </div>
  );
}
