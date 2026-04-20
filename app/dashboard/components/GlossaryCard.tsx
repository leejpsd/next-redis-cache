const TERMS = [
  {
    term: "k6",
    short: "부하 테스트 도구",
    desc: "HTTP 엔드포인트에 가상 사용자(VU)로 동시 요청을 보내 응답 시간·에러율·처리량을 측정. 이 프로젝트는 baseline / spike / soak 세 종류를 돌렸다.",
  },
  {
    term: "Lighthouse",
    short: "Chrome 기반 성능 측정",
    desc: "브라우저 관점에서 LCP, FCP, TBT, Speed Index, TTI, CLS 등 사용자 체감 성능 지표를 수집. 모바일 4G · Slow 3G 두 프로파일로 측정.",
  },
  {
    term: "Playwright",
    short: "브라우저 자동화",
    desc: "실제 브라우저에서 페이지를 열고 pageReady(데이터까지 도착)·browserFetch(fetch 순수 시간) 등 DOM 단위 타이밍을 직접 계측.",
  },
  {
    term: "p95 / p50 / p90",
    short: "응답 시간 분위수",
    desc: "요청 100개를 빠른 순으로 줄 세웠을 때 95번째(95%의 사용자가 이 안에 응답 받음), 50번째(중앙값), 90번째 지점. 평균(avg)보다 현실 체감에 가까움.",
  },
  {
    term: "TTFB",
    short: "Time To First Byte",
    desc: "요청을 보낸 뒤 서버가 첫 바이트를 돌려줄 때까지의 시간. 이 프로젝트에선 k6의 http_req_waiting (네트워크 대기)이 가장 근접한 지표.",
  },
  {
    term: "LCP",
    short: "Largest Contentful Paint",
    desc: "페이지에서 가장 큰 콘텐츠(이미지·텍스트 블록)가 화면에 나타나는 시점. Core Web Vitals의 핵심으로, 사용자가 '뜬다'고 느끼는 순간에 가장 가깝다.",
  },
  {
    term: "FCP",
    short: "First Contentful Paint",
    desc: "첫 픽셀이 화면에 그려지는 시점. LCP보다 이른 시점이며 '깜빡'하고 뭔가 보이기 시작하는 순간.",
  },
  {
    term: "TBT",
    short: "Total Blocking Time",
    desc: "FCP 이후 메인 스레드가 50ms 이상 막혀 있던 총 시간의 합. 스크롤·클릭이 끊기는 체감과 직결.",
  },
  {
    term: "CLS",
    short: "Cumulative Layout Shift",
    desc: "페이지가 로드되는 동안 레이아웃이 흔들린 누적량. 0에 가까울수록 안정적.",
  },
  {
    term: "Speed Index",
    short: "시각적 완성 속도",
    desc: "페이지 로딩 중 화면 상단이 얼마나 빨리 '가득' 채워지는지. 낮을수록 좋음.",
  },
  {
    term: "TTI",
    short: "Time to Interactive",
    desc: "페이지가 완전히 상호작용 가능한 상태에 도달하는 시점. JS 실행·리스너 부착이 끝난 시점.",
  },
  {
    term: "Spike 테스트",
    short: "갑작스러운 부하",
    desc: "트래픽을 짧은 시간에 급격히 올려 운영 한계를 본다. 이 프로젝트는 3경로 동시에 각 30 VU로 5분 hold.",
  },
  {
    term: "Soak 테스트",
    short: "장시간 부하",
    desc: "오랫동안 꾸준한 트래픽을 흘려 메모리 누수·연결 누적 같은 장기 안정성을 확인. shared-cache 경로에 30분간 10 VU.",
  },
  {
    term: "VU",
    short: "Virtual User",
    desc: "k6에서 동시 트래픽을 흉내 내는 가상 사용자 단위. 30 VU = 30명이 계속 요청을 보낸다고 생각하면 됨.",
  },
];

export function GlossaryCard() {
  return (
    <details className="glass-card group rounded-[2rem] px-6 py-5 sm:px-7 [&[open]>summary>svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Glossary</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-stone-950">
            용어 설명 (측정 도구와 지표)
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            이 대시보드에 등장하는 k6 · Lighthouse · LCP · p95 등 용어를 한
            자리에 모았습니다. 클릭해서 펼쳐보세요.
          </p>
        </div>
        <svg
          className="mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="M5 7l5 6 5-6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TERMS.map((t) => (
          <div
            key={t.term}
            className="rounded-xl border border-stone-300/80 bg-white/5 p-3.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-stone-950">{t.term}</p>
              <p className="text-[11px] text-stone-500">{t.short}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-600">{t.desc}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
