/**
 * Act 4 진입 지점의 한 문장 클라이맥스 — 스토리의 절정 포인트.
 * "전략은 하나가 아니다, 화면별이다"를 시각적으로 강조.
 */

export function ClimaxBanner() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-emerald-700/15 bg-emerald-900/5 px-6 py-8 sm:px-10 sm:py-10">
      {/* accent glow 백그라운드 */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0, 220, 130, 0.22), transparent 60%)",
        }}
        aria-hidden
      />
      <p className="eyebrow text-emerald-800">Climax</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-[2.4rem] sm:leading-[1.15]">
        전략은 <span className="text-emerald-800">&ldquo;하나&rdquo;</span>를 고르는 게 아니다.
        <br />
        <span className="text-stone-500">화면마다 다르다.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
        이 프로젝트에서 배운 진짜 교훈은 하나다. 수치가 말하는 건
        &ldquo;전부 CSR&rdquo;이나 &ldquo;전부 SSR&rdquo;이 아니라,{" "}
        <span className="font-semibold text-stone-950">
          화면이 요구하는 일관성·SEO·스파이크 견고성·비용을 동시에 만족시키는
          전략이 화면마다 다르다
        </span>
        는 것. Hybrid가 메인 페이지의 현실적인 답이 된 이유다.
      </p>
    </div>
  );
}
