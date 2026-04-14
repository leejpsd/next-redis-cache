import Link from "next/link";

const experimentLinks = [
  {
    href: "/experiments/csr",
    eyebrow: "Baseline",
    title: "Direct client call",
    description: "브라우저가 외부 origin을 직접 호출하는 CSR 기준선입니다.",
  },
  {
    href: "/experiments/bff",
    eyebrow: "Client + Server Edge",
    title: "BFF",
    description:
      "브라우저는 내부 BFF 엔드포인트만 호출하고, 프론트 서버가 외부 origin을 대신 호출합니다.",
  },
  {
    href: "/experiments/ssr",
    eyebrow: "Server Render",
    title: "SSR",
    description: "요청마다 서버가 원본 데이터를 다시 가져와 렌더링합니다.",
  },
  {
    href: "/experiments/isr-fetch",
    eyebrow: "Incremental Cache",
    title: "ISR with fetch",
    description:
      "`fetch(..., { next: { revalidate, tags } })` 기반 경로가 self-hosting에서 어떤 캐시를 타는지 봅니다.",
  },
  {
    href: "/experiments/shared-cache",
    eyebrow: "Cache Components",
    title: "Shared Cache",
    description:
      "`use cache` + Redis shared cache로 멀티 인스턴스 정합성을 확보한 after 경로입니다.",
  },
];

export default function ExperimentsIndexPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Experiments</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-[3rem]">
            SSR, ISR, Cache Components 비교 실험
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            메인 페이지는 before / after를 보여주는 데모이고, 이 영역은 각 렌더링
            전략과 네트워크 경로를 독립된 경로로 분리해 성능과 비용의
            trade-off를 측정하기 위한 실험용 진입점입니다.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {experimentLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-card rounded-[1.8rem] px-6 py-6 transition-transform duration-150 hover:-translate-y-0.5"
            >
              <p className="eyebrow">{item.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {item.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
