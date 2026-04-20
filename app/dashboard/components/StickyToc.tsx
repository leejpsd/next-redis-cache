"use client";

import { useEffect, useState } from "react";

/**
 * 대시보드 좌측에 스크롤 연동되어 현재 섹션을 하이라이트하는 작은 TOC.
 * viewport가 xl 미만일 땐 숨겨진다(긴 대시보드를 위한 보조 네비).
 */

type Entry = {
  id: string;
  label: string;
  tone?: "question" | "twist" | "evidence" | "conclusion";
};

const ENTRIES: Entry[] = [
  { id: "toc-hero", label: "시작 · 결론 먼저" },
  { id: "toc-arch", label: "아키텍처" },
  { id: "toc-act1", label: "Act 1. 서버 시간만 보면", tone: "question" },
  { id: "toc-act2-lcp", label: "Act 2. 사용자 체감", tone: "twist" },
  { id: "toc-act2-seo", label: "Act 2. SEO", tone: "twist" },
  { id: "toc-act2-origin", label: "Act 2. Origin API", tone: "twist" },
  { id: "toc-act3", label: "Act 3. 공유 캐시 효과", tone: "evidence" },
  { id: "toc-climax", label: "Climax", tone: "conclusion" },
  { id: "toc-act4", label: "Act 4. 최선의 선택", tone: "conclusion" },
  { id: "toc-act5", label: "Act 5. 운영 사고" },
  { id: "toc-appendix", label: "Appendix · Raw Data" },
  { id: "toc-cta", label: "Next Actions" },
];

const toneDot: Record<NonNullable<Entry["tone"]>, string> = {
  question: "#a1a1a1",
  twist: "#ff4d4f",
  evidence: "#00dc82",
  conclusion: "#00dc82",
};

export function StickyToc() {
  const [activeId, setActiveId] = useState<string>(ENTRIES[0].id);

  useEffect(() => {
    const targets = ENTRIES.map((e) => document.getElementById(e.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 가장 위쪽에서 intersecting인 것을 active로 취급
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(topMost.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      aria-label="대시보드 목차"
      className="sticky top-6 hidden w-48 shrink-0 xl:block"
    >
      <p className="eyebrow">목차</p>
      <ul className="mt-3 space-y-1 text-[11px] leading-5">
        {ENTRIES.map((e) => {
          const isActive = e.id === activeId;
          const color = e.tone ? toneDot[e.tone] : "#6b6b6b";
          return (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className={`group flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${
                  isActive
                    ? "bg-white/5 text-stone-950"
                    : "text-stone-500 hover:bg-white/5 hover:text-stone-950"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full transition-opacity"
                  style={{
                    background: color,
                    opacity: isActive ? 1 : 0.35,
                  }}
                  aria-hidden
                />
                <span className="truncate">{e.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
