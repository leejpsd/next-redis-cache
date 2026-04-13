"use client";

import { useEffect, useState } from "react";
import type { RandomUserPayload } from "@/app/lib/getRandomUser";
import { ExperimentSnapshot } from "./ExperimentSnapshot";

type ClientState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: RandomUserPayload };

export function CsrRandomUserClient() {
  const [state, setState] = useState<ClientState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/experiments/random-user", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSR payload: ${response.status}`);
        }

        const payload = (await response.json()) as RandomUserPayload;
        if (!cancelled) {
          setState({ status: "ready", payload });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <section className="glass-card rounded-[2rem] px-6 py-12 text-center sm:px-7">
            <p className="eyebrow">Experiment / CSR</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
              Client-side rendering baseline
            </h1>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              브라우저에서 데이터를 가져오는 중입니다.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <section className="glass-card rounded-[2rem] px-6 py-12 sm:px-7">
            <p className="eyebrow">Experiment / CSR</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
              Client-side rendering baseline
            </h1>
            <p className="mt-4 text-sm leading-6 text-rose-700">{state.message}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <ExperimentSnapshot
      eyebrow="Experiment / CSR"
      title="Client-side rendering baseline"
      description="초기 HTML에는 데이터가 없고, 브라우저가 hydrate 된 뒤 데이터를 가져와 그립니다. 서버 렌더 비용을 줄이는 대신 사용자에게는 로딩 지연이 노출될 수 있는 기준선입니다."
      strategySummary="이 경로는 클라이언트가 페이지 진입 후 데이터를 가져와 렌더링합니다. 이후 실험에서는 이 기준선을 SSR, ISR(fetch), Cache Components + Redis와 비교합니다."
      payload={state.payload}
      renderer={null}
    />
  );
}
