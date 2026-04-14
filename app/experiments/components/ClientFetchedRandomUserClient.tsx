"use client";

import { useEffect, useState } from "react";
import type { RandomUserPayload } from "@/app/lib/getRandomUser";
import { ExperimentSnapshot } from "./ExperimentSnapshot";

type ClientState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      payload: RandomUserPayload;
      metrics: {
        fetchDurationMs: number;
        readyDurationMs: number;
        bffDurationMs: number | null;
      };
    };

type ClientFetchedRandomUserClientProps = {
  eyebrow: string;
  title: string;
  description: string;
  strategySummary: string;
  endpoint: string;
  mode: "direct-client" | "bff";
};

type RandomUserOriginResponse = Omit<RandomUserPayload, "fetchedAt" | "source" | "generatedBy">;

function mapOriginPayload(raw: RandomUserOriginResponse, mode: "direct-client" | "bff"): RandomUserPayload {
  return {
    ...raw,
    fetchedAt: Date.now(),
    source: "origin",
    generatedBy: {
      instanceId: mode === "direct-client" ? "browser:direct-client" : "browser:bff",
      taskId: null,
      hostname: "browser",
      pid: 0,
      bootId: mode,
      region: null,
      nodeEnv: null,
    },
  };
}

function parseBffDuration(response: Response): number | null {
  const headerValue =
    response.headers.get("x-bff-duration-ms") ??
    response.headers.get("server-timing");

  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/bff;dur=([\d.]+)/) ?? headerValue.match(/([\d.]+)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ClientFetchedRandomUserClient({
  eyebrow,
  title,
  description,
  strategySummary,
  endpoint,
  mode,
}: ClientFetchedRandomUserClientProps) {
  const [state, setState] = useState<ClientState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const startedAt = performance.now();
        const response = await fetch(endpoint, {
          cache: "no-store",
        });
        const responseReceivedAt = performance.now();

        if (!response.ok) {
          throw new Error(`Failed to fetch client payload: ${response.status}`);
        }

        const payload = mapOriginPayload(
          (await response.json()) as RandomUserOriginResponse,
          mode
        );
        const readyAt = performance.now();

        if (!cancelled) {
          setState({
            status: "ready",
            payload,
            metrics: {
              fetchDurationMs: responseReceivedAt - startedAt,
              readyDurationMs: readyAt - startedAt,
              bffDurationMs: parseBffDuration(response),
            },
          });
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
  }, [endpoint, mode]);

  if (state.status === "loading") {
    return (
      <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <section className="glass-card rounded-[2rem] px-6 py-12 text-center sm:px-7">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
              {title}
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
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-rose-700">{state.message}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <ExperimentSnapshot
      eyebrow={eyebrow}
      title={title}
      description={description}
      strategySummary={strategySummary}
      payload={state.payload}
      renderer={null}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-300/80 bg-white/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
            Browser Fetch
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
            {state.metrics.fetchDurationMs.toFixed(1)}ms
          </p>
        </div>
        <div className="rounded-2xl border border-stone-300/80 bg-white/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
            Ready To Paint
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
            {state.metrics.readyDurationMs.toFixed(1)}ms
          </p>
        </div>
        <div className="rounded-2xl border border-stone-300/80 bg-white/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
            BFF Server Time
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
            {state.metrics.bffDurationMs === null
              ? "-"
              : `${state.metrics.bffDurationMs.toFixed(1)}ms`}
          </p>
        </div>
      </div>

      <pre id="client-fetch-metrics" className="sr-only">
        {JSON.stringify(state.metrics)}
      </pre>
    </ExperimentSnapshot>
  );
}
