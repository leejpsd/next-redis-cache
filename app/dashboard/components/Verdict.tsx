/**
 * 데이터 표/차트 바로 밑에 붙는 해석 강제 박스.
 * "이 표를 본 뒤 결론을 어떤 방향으로 해석해야 하는가"를 독자에게 직접 말한다.
 */

type Tone = "danger" | "warn" | "good";

const toneStyles: Record<
  Tone,
  { border: string; bg: string; label: string; labelColor: string }
> = {
  danger: {
    border: "border-rose-700/15",
    bg: "bg-rose-900/5",
    label: "Verdict · CSR 페널티",
    labelColor: "text-rose-800",
  },
  warn: {
    border: "border-amber-700/15",
    bg: "bg-amber-900/5",
    label: "Verdict · 주의",
    labelColor: "text-amber-800",
  },
  good: {
    border: "border-emerald-700/15",
    bg: "bg-emerald-900/5",
    label: "Verdict · 공유 캐시의 효과",
    labelColor: "text-emerald-800",
  },
};

export function Verdict({
  tone = "danger",
  title,
  children,
  source,
}: {
  tone?: Tone;
  title: string;
  children: React.ReactNode;
  source?: React.ReactNode;
}) {
  const style = toneStyles[tone];
  return (
    <div
      className={`mt-4 rounded-2xl border px-5 py-4 ${style.border} ${style.bg}`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${style.labelColor}`}
      >
        {style.label}
      </p>
      <p className="mt-1.5 text-sm font-semibold tracking-[-0.02em] text-stone-950">
        {title}
      </p>
      <div className="mt-2 text-sm leading-6 text-stone-700">{children}</div>
      {source}
    </div>
  );
}
