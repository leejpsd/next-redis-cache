import Link from "next/link";

/**
 * 대시보드 최하단 CTA — 읽은 뒤 독자가 바로 취할 수 있는 다음 행동을 제안.
 * 실험 해보기 / 블로그 읽기 / 코드 보기 3갈래.
 */

const ACTIONS = [
  {
    title: "직접 실험해보기",
    detail:
      "6개 전략 라우트에 실제 요청을 보내고 응답 헤더 · HTML 구조를 비교해볼 수 있습니다.",
    href: "/experiments",
    cta: "Experiments 라우트 →",
    tone: "good" as const,
  },
  {
    title: "4편 블로그 전문 읽기",
    detail:
      "이 대시보드의 모든 수치 뒤에 있는 서사와 해석. Act 1~5 스토리라인 그대로.",
    href: "https://www.eddy-dev.xyz",
    cta: "블로그로 →",
    tone: "good" as const,
    external: true,
  },
  {
    title: "측정·코드 검증",
    detail:
      "측정 스크립트와 전체 구현을 GitHub에서 직접 확인·재현할 수 있습니다.",
    href: "https://github.com/leejpsd/next-redis-cache",
    cta: "GitHub →",
    tone: "good" as const,
    external: true,
  },
];

export function FinalCta() {
  return (
    <section className="glass-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p className="eyebrow">Next Actions</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
        그래서 이제 무엇을 볼까
      </h2>
      <p className="mt-2 text-xs text-stone-500">
        데이터가 모두 수록돼 있으니, 읽는 것으로 끝내지 말고 직접 눌러보거나 코드를
        검증해보는 걸 권합니다.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {ACTIONS.map((a) => (
          <ActionCard key={a.title} {...a} />
        ))}
      </div>
    </section>
  );
}

function ActionCard({
  title,
  detail,
  href,
  cta,
  external = false,
}: {
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: "good";
  external?: boolean;
}) {
  const className =
    "group flex h-full flex-col justify-between rounded-2xl border border-emerald-700/15 bg-emerald-900/5 px-5 py-5 transition-colors hover:border-emerald-700/30";

  const content = (
    <>
      <div>
        <p className="eyebrow text-emerald-800">{cta.replace(/\s*→$/, "")}</p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-stone-950">
          {title}
        </h3>
        <p className="mt-2 text-xs leading-5 text-stone-500">{detail}</p>
      </div>
      <p className="mt-4 text-sm font-semibold text-emerald-800">
        {cta} <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
      </p>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
