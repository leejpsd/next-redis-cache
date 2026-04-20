/**
 * Verdict 박스 하단에 붙이는 출처·재현 방법 펼침.
 * 독자가 "진짜인가?"에 바로 답할 수 있게, 원본 JSON 경로와 재현 명령을 함께 보여준다.
 */

type Source = {
  label: string;
  path: string;
};

export function SourceLink({
  sources,
  reproduce,
}: {
  sources: Source[];
  reproduce?: string;
}) {
  return (
    <details className="mt-3 rounded-xl border border-stone-300/80 bg-white/5 px-3 py-2 text-[11px] leading-5 text-stone-500 [&[open]>summary>svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="rounded bg-stone-900/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            출처 · 재현
          </span>
          <span className="text-stone-600">원본 데이터와 재현 명령 보기</span>
        </span>
        <svg
          className="h-3.5 w-3.5 text-stone-500 transition-transform"
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
      <div className="mt-2 space-y-1.5 text-[11px]">
        {sources.map((s) => (
          <div key={s.path} className="flex items-baseline gap-2">
            <span className="text-stone-600">{s.label}</span>
            <code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-[10px] text-stone-100">
              {s.path}
            </code>
          </div>
        ))}
        {reproduce ? (
          <pre className="mt-2 overflow-x-auto rounded bg-stone-900/5 px-3 py-2 text-[10px] leading-5 text-stone-100">
            {reproduce}
          </pre>
        ) : null}
      </div>
    </details>
  );
}
