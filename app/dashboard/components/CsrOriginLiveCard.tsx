/**
 * CSR 세션당 origin 호출 횟수 실측 카드.
 * docs/load-test/2026-04-20/origin-fetch-per-session.json 기반.
 */

const STATS = {
  csr: { avg: 1.0, min: 1, max: 1, sessions: 5, monthly1M: 1_000_000 },
  others: [
    { key: "SSR", note: "서버가 매 요청 origin 프록시 (브라우저엔 0)" },
    { key: "ISR", note: "서버가 TTL 주기마다만 origin 호출" },
    { key: "Cache Components", note: "Redis 공유 캐시로 전파" },
    { key: "Hybrid", note: "섹션별 TTL, 브라우저 직접 호출 0" },
    { key: "BFF", note: "/api/bff가 프록시 (브라우저 직접 호출 0)" },
  ],
};

export function CsrOriginLiveCard() {
  return (
    <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">브라우저 origin 호출 · Playwright 실측</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            CSR은 세션당 정확히 1회 — 사용자 수만큼 원본이 증가
          </h2>
        </div>
        <span className="rounded-full border border-stone-300/80 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          fresh context × {STATS.csr.sessions} sessions
        </span>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        &ldquo;CSR로 서버비 아끼고 유저한테 넘기면 되지 않나&rdquo;에 대한 가장
        직접적인 반박. 실제로 브라우저 한 대가 몇 번 <code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-[11px]">randomuser.me</code>
        를 직접 때리는지 Playwright로 네트워크 이벤트를 잡아 카운트했습니다.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* 좌측: CSR 결과 대형 숫자 */}
        <div className="rounded-2xl border border-rose-700/15 bg-rose-900/5 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-rose-800">
            CSR · session 당 호출 수
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span
              className="metric-number text-6xl font-semibold text-rose-900"
              style={{ textShadow: "0 0 24px rgba(255, 77, 79, 0.5)" }}
            >
              {STATS.csr.avg.toFixed(1)}
            </span>
            <span className="text-xs text-stone-500">회 / session</span>
          </div>
          <dl className="mt-4 space-y-1.5 text-[11px] text-stone-500">
            <div className="flex justify-between">
              <dt>세션 수</dt>
              <dd className="metric-number text-stone-100">
                {STATS.csr.sessions}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>min / max</dt>
              <dd className="metric-number text-stone-100">
                {STATS.csr.min} / {STATS.csr.max}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>분산</dt>
              <dd className="metric-number text-stone-100">0</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-rose-700/15 pt-3 text-[11px] leading-5 text-stone-500">
            분산이 0이라는 건{" "}
            <span className="metric-number text-rose-900">
              &ldquo;사용자 N명 = origin 호출 N개&rdquo;
            </span>{" "}
            가 구조적으로 확정됐다는 뜻. 월 100만 세션이면 그대로 1M 호출.
          </p>
        </div>

        {/* 우측: 나머지 전략 0회 */}
        <div className="rounded-2xl border border-emerald-700/15 bg-emerald-900/5 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-800">
            나머지 전략 · 브라우저 직접 호출
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span
              className="metric-number text-6xl font-semibold text-emerald-800"
              style={{ textShadow: "0 0 24px rgba(0, 220, 130, 0.45)" }}
            >
              0
            </span>
            <span className="text-xs text-stone-500">회 / session (5종 전부)</span>
          </div>
          <ul className="mt-4 space-y-2 text-[11px] leading-5 text-stone-500">
            {STATS.others.map((o) => (
              <li key={o.key} className="flex gap-2">
                <span className="metric-number text-stone-100">{o.key}</span>
                <span>·</span>
                <span>{o.note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-emerald-700/15 pt-3 text-[11px] leading-5 text-stone-500">
            서버 렌더 전략은 origin 호출이 TTL 주기 · 태그 무효화 주기에
            귀속된다. 사용자 수와 <span className="text-emerald-800">분리됨</span>.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-stone-300/80 bg-white/5 px-4 py-3 text-[11px] leading-5 text-stone-500">
        <span className="font-semibold text-stone-950">월 100만 세션 환산:</span>{" "}
        CSR <span className="metric-number text-rose-900">1,000,000</span> 회 ·
        ISR/Hybrid는 TTL 60s 기준 <span className="metric-number">43,200</span>
        회 수준(서버 1대 기준). 같은 트래픽에서{" "}
        <span className="metric-number text-rose-900">약 23배</span> 차이.
      </div>
    </div>
  );
}
