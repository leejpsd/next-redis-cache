/**
 * 섹션 사이를 잇는 작은 다리 박스.
 * 독자가 "지금 왜 다음 표를 봐야 하는지"를 한 문장으로 안내한다.
 */

type Tone = "question" | "twist" | "evidence" | "conclusion";

const toneStyles: Record<Tone, { bg: string; accent: string; label: string }> = {
  question: {
    bg: "border-stone-300/80 bg-white/5",
    accent: "text-stone-400",
    label: "다음 질문",
  },
  twist: {
    bg: "border-rose-700/15 bg-rose-900/5",
    accent: "text-rose-800",
    label: "하지만",
  },
  evidence: {
    bg: "border-stone-300/80 bg-white/5",
    accent: "text-emerald-800",
    label: "증거",
  },
  conclusion: {
    bg: "border-emerald-700/15 bg-emerald-900/5",
    accent: "text-emerald-800",
    label: "정리",
  },
};

export function StoryTransition({
  tone = "question",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  const style = toneStyles[tone];
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border px-5 py-4 ${style.bg}`}
    >
      <span
        className={`shrink-0 rounded-full border border-stone-300/80 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${style.accent}`}
      >
        {style.label}
      </span>
      <p className="text-sm leading-6 text-stone-700">{children}</p>
    </div>
  );
}
