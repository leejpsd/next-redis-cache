import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import {
  getRandomUser,
  getLiveRandomUser,
  type RandomUserPayload,
} from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";

export default function HybridExperimentPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Shell />

        <Suspense fallback={<SectionFallback title="메인 배너" note="hours TTL" />}>
          <BannerSection />
        </Suspense>

        <Suspense fallback={<SectionFallback title="랭킹" note="minutes TTL" />}>
          <RankingSection />
        </Suspense>

        <Suspense fallback={<SectionFallback title="실시간 피드" note="no cache, request time" />}>
          <LiveFeedSection />
        </Suspense>
      </div>
    </main>
  );
}

function Shell() {
  const renderer = getRuntimeIdentity();
  return (
    <section className="glass-card rounded-[2rem] px-6 py-7 sm:px-7">
      <p className="eyebrow">Experiment / Hybrid</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
        Streaming SSR + per-section Cache Components
      </h1>
      <p className="mt-4 text-sm leading-6 text-stone-600">
        한 페이지 안에서 섹션별로 다른 캐시 전략을 쓰고, Suspense 경계로 각 섹션을
        병렬 스트리밍합니다. shell과 쉘은 즉시 내려가고, 각 섹션은 준비되는 대로
        붙습니다.
      </p>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        rendered by {renderer?.instanceId ?? "unknown"}
      </p>
    </section>
  );
}

async function BannerSection() {
  "use cache";
  cacheLife("hours");
  cacheTag("hybrid:banner");

  const payload = await getRandomUser();
  return (
    <SectionCard
      title="메인 배너"
      tag="hybrid:banner"
      life="hours"
      strategy="use cache + cacheLife('hours')"
      description="거의 안 바뀌는 운영 배너. 긴 TTL로 원본 호출 최소화."
      payload={payload}
    />
  );
}

async function RankingSection() {
  "use cache";
  cacheLife("minutes");
  cacheTag("hybrid:ranking");

  const payload = await getRandomUser();
  return (
    <SectionCard
      title="랭킹"
      tag="hybrid:ranking"
      life="minutes"
      strategy="use cache + cacheLife('minutes')"
      description="분 단위로 갱신되는 집계 데이터. 태그 단위 무효화로 즉시 반영."
      payload={payload}
    />
  );
}

async function LiveFeedSection() {
  await connection();
  const payload = await getLiveRandomUser();
  return (
    <SectionCard
      title="실시간 피드"
      tag="(no cache)"
      life="per request"
      strategy="fetch no-store"
      description="실시간성이 필요한 영역. 캐시하지 않고 요청 시마다 원본 조회."
      payload={payload}
    />
  );
}

function SectionCard({
  title,
  tag,
  life,
  strategy,
  description,
  payload,
}: {
  title: string;
  tag: string;
  life: string;
  strategy: string;
  description: string;
  payload: RandomUserPayload;
}) {
  const user = payload.results[0];
  const fullName = `${user.name.title} ${user.name.first} ${user.name.last}`;

  return (
    <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="mt-1 text-xs text-stone-500">
            {strategy} · tag: {tag} · life: {life}
          </p>
        </div>
        <span className="rounded-full bg-stone-900/5 px-3 py-1 text-xs text-stone-600">
          {payload.source}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
      <p className="mt-4 text-lg font-medium text-stone-950">{fullName}</p>
      <p className="text-xs text-stone-500">
        {user.location.city}, {user.location.country}
      </p>
    </section>
  );
}

function SectionFallback({ title, note }: { title: string; note: string }) {
  return (
    <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-xs text-stone-500">loading — {note}</p>
      <div className="mt-4 h-5 w-40 animate-pulse rounded-md bg-stone-200" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded-md bg-stone-200" />
    </section>
  );
}
