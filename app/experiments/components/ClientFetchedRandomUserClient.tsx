"use client";

import { useEffect, useState } from "react";
import type { RandomUserPayload } from "@/app/lib/getRandomUser";
import { ExperimentSnapshot } from "./ExperimentSnapshot";

type ClientState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: RandomUserPayload };

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
        const response = await fetch(endpoint, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch client payload: ${response.status}`);
        }

        const payload = mapOriginPayload(
          (await response.json()) as RandomUserOriginResponse,
          mode
        );

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
    />
  );
}
