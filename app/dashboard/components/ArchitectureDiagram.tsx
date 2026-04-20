/**
 * AWS Self-hosting 구성 다이어그램 (순수 SVG).
 * 이 프로젝트가 깔아둔 실제 인프라를 한 장의 그림으로 보여준다.
 * - 외부 사용자 / Googlebot / 크롤러
 * - ALB
 * - ECS Fargate × 2 task
 * - ElastiCache Redis (공유 캐시)
 * - Origin API (randomuser.me)
 */

export function ArchitectureDiagram() {
  return (
    <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">Architecture</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            이 대시보드의 모든 수치가 나오는 실제 구성
          </h2>
        </div>
        <span className="rounded-full border border-stone-300/80 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          ap-southeast-2 · staging
        </span>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        ECS Fargate 2 태스크가 같은 ElastiCache Redis를 공유하는 구성. &ldquo;멀티
        인스턴스에서도 같은 캐시 상태를 본다&rdquo;가 설계의 중심이다.
      </p>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox="0 0 900 400"
          role="img"
          aria-label="AWS self-hosting 아키텍처 다이어그램"
          className="block min-w-[720px] w-full"
        >
          <defs>
            <linearGradient id="arch-task-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <linearGradient id="arch-redis-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,220,130,0.18)" />
              <stop offset="100%" stopColor="rgba(0,220,130,0.04)" />
            </linearGradient>
            <marker
              id="arch-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#a1a1a1" />
            </marker>
            <marker
              id="arch-arrow-accent"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#00dc82" />
            </marker>
          </defs>

          {/* User & Crawlers */}
          <g>
            <rect
              x="40"
              y="30"
              width="160"
              height="58"
              rx="12"
              fill="url(#arch-task-grad)"
              stroke="rgba(255,255,255,0.14)"
            />
            <text x="120" y="52" textAnchor="middle" fill="#ededed" fontSize="14" fontWeight="600">
              사용자 · Googlebot
            </text>
            <text x="120" y="72" textAnchor="middle" fill="#a1a1a1" fontSize="11">
              브라우저 / 크롤러 요청
            </text>
          </g>

          {/* ALB */}
          <g>
            <rect
              x="360"
              y="30"
              width="180"
              height="58"
              rx="12"
              fill="url(#arch-task-grad)"
              stroke="rgba(50,145,255,0.35)"
            />
            <text x="450" y="52" textAnchor="middle" fill="#3291ff" fontSize="13" fontWeight="700" letterSpacing="2">
              ALB
            </text>
            <text x="450" y="72" textAnchor="middle" fill="#a1a1a1" fontSize="11">
              Application Load Balancer
            </text>
          </g>

          {/* Arrow: User -> ALB */}
          <line
            x1="200"
            y1="59"
            x2="360"
            y2="59"
            stroke="#a1a1a1"
            strokeWidth="1.5"
            markerEnd="url(#arch-arrow)"
          />

          {/* ECS Tasks */}
          <g>
            {/* Task A */}
            <rect
              x="260"
              y="160"
              width="180"
              height="78"
              rx="12"
              fill="url(#arch-task-grad)"
              stroke="rgba(255,255,255,0.16)"
            />
            <text x="350" y="183" textAnchor="middle" fill="#ededed" fontSize="13" fontWeight="600">
              ECS Task A
            </text>
            <text x="350" y="201" textAnchor="middle" fill="#a1a1a1" fontSize="11">
              Next.js 16 · port 3000
            </text>
            <text x="350" y="219" textAnchor="middle" fill="#6b6b6b" fontSize="10" fontFamily="monospace">
              0.5 vCPU · 1 GB
            </text>

            {/* Task B */}
            <rect
              x="470"
              y="160"
              width="180"
              height="78"
              rx="12"
              fill="url(#arch-task-grad)"
              stroke="rgba(255,255,255,0.16)"
            />
            <text x="560" y="183" textAnchor="middle" fill="#ededed" fontSize="13" fontWeight="600">
              ECS Task B
            </text>
            <text x="560" y="201" textAnchor="middle" fill="#a1a1a1" fontSize="11">
              Next.js 16 · port 3000
            </text>
            <text x="560" y="219" textAnchor="middle" fill="#6b6b6b" fontSize="10" fontFamily="monospace">
              0.5 vCPU · 1 GB
            </text>
          </g>

          {/* ALB -> Tasks */}
          <line
            x1="420"
            y1="88"
            x2="350"
            y2="160"
            stroke="#a1a1a1"
            strokeWidth="1.5"
            markerEnd="url(#arch-arrow)"
          />
          <line
            x1="480"
            y1="88"
            x2="560"
            y2="160"
            stroke="#a1a1a1"
            strokeWidth="1.5"
            markerEnd="url(#arch-arrow)"
          />

          {/* Redis */}
          <g>
            <rect
              x="320"
              y="290"
              width="260"
              height="78"
              rx="12"
              fill="url(#arch-redis-grad)"
              stroke="rgba(0,220,130,0.45)"
            />
            <text x="450" y="313" textAnchor="middle" fill="#00dc82" fontSize="13" fontWeight="700" letterSpacing="1">
              ElastiCache Redis
            </text>
            <text x="450" y="331" textAnchor="middle" fill="#a1a1a1" fontSize="11">
              Shared cache (next-cache:entry:*, next-cache:tag:*)
            </text>
            <text x="450" y="349" textAnchor="middle" fill="#6b6b6b" fontSize="10" fontFamily="monospace">
              cache.t4g.micro · single-AZ
            </text>
          </g>

          {/* Task A -> Redis (accent) */}
          <line
            x1="350"
            y1="238"
            x2="410"
            y2="290"
            stroke="#00dc82"
            strokeWidth="1.8"
            strokeDasharray="4 3"
            markerEnd="url(#arch-arrow-accent)"
          />
          {/* Task B -> Redis (accent) */}
          <line
            x1="560"
            y1="238"
            x2="500"
            y2="290"
            stroke="#00dc82"
            strokeWidth="1.8"
            strokeDasharray="4 3"
            markerEnd="url(#arch-arrow-accent)"
          />

          {/* Origin API */}
          <g>
            <rect
              x="700"
              y="160"
              width="160"
              height="78"
              rx="12"
              fill="url(#arch-task-grad)"
              stroke="rgba(245,166,35,0.3)"
            />
            <text x="780" y="183" textAnchor="middle" fill="#f5a623" fontSize="13" fontWeight="600">
              Origin API
            </text>
            <text x="780" y="201" textAnchor="middle" fill="#a1a1a1" fontSize="11">
              randomuser.me / api
            </text>
            <text x="780" y="219" textAnchor="middle" fill="#6b6b6b" fontSize="10" fontFamily="monospace">
              외부 / TTL 주기당 호출
            </text>
          </g>

          {/* Task B -> Origin */}
          <line
            x1="650"
            y1="199"
            x2="700"
            y2="199"
            stroke="#a1a1a1"
            strokeWidth="1.5"
            markerEnd="url(#arch-arrow)"
          />

          {/* Annotation: revalidateTag 전파 */}
          <g>
            <text x="450" y="252" textAnchor="middle" fill="#00dc82" fontSize="11" fontWeight="600">
              revalidateTag → Redis → 양쪽 태스크 동시 반영 (실측 6.4ms)
            </text>
          </g>

          {/* Side: CSR only arrow */}
          <g opacity="0.7">
            <text x="80" y="200" fill="#ff4d4f" fontSize="11" fontWeight="600">
              CSR 경로:
            </text>
            <text x="80" y="218" fill="#a1a1a1" fontSize="10">
              브라우저가 origin을
            </text>
            <text x="80" y="232" fill="#a1a1a1" fontSize="10">
              직접 호출 (사용자 1 = 1회)
            </text>
            <line
              x1="130"
              y1="88"
              x2="700"
              y2="170"
              stroke="#ff4d4f"
              strokeWidth="1.3"
              strokeDasharray="3 3"
              markerEnd="url(#arch-arrow)"
              opacity="0.6"
            />
          </g>
        </svg>
      </div>

      <div className="mt-5 grid gap-3 text-xs leading-5 text-stone-500 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-700/15 bg-emerald-900/5 px-3 py-2">
          <p className="font-semibold text-emerald-800">초록 점선</p>
          <p className="mt-0.5">태스크 ↔ Redis 공유 캐시 경로. 무효화 전파 6.4ms.</p>
        </div>
        <div className="rounded-xl border border-rose-700/15 bg-rose-900/5 px-3 py-2">
          <p className="font-semibold text-rose-900">빨간 점선</p>
          <p className="mt-0.5">CSR이 브라우저에서 origin을 직접 치는 경로. 사용자 수만큼 호출.</p>
        </div>
        <div className="rounded-xl border border-stone-300/80 bg-white/5 px-3 py-2">
          <p className="font-semibold text-stone-950">회색 실선</p>
          <p className="mt-0.5">ALB → 태스크, 태스크 → origin(서버 렌더 시). TTL 주기만큼만 호출.</p>
        </div>
      </div>
    </section>
  );
}
