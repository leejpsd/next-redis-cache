import { cacheLife, cacheTag } from "next/cache";

type ProbePayload = {
  mode: string;
  count: number;
  servedAt: number;
};

function getProbeSourceBaseUrl(): string {
  const baseUrl = process.env.CACHE_PROBE_SOURCE_URL;
  if (!baseUrl) {
    throw new Error("CACHE_PROBE_SOURCE_URL is required for cache verification routes.");
  }
  return baseUrl;
}

async function fetchProbe(mode: string, init?: RequestInit): Promise<ProbePayload> {
  const url = new URL(`/probe?mode=${encodeURIComponent(mode)}`, getProbeSourceBaseUrl());
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Probe fetch failed: ${response.status}`);
  }

  return (await response.json()) as ProbePayload;
}

export async function getProbeWithFetchRevalidate(mode: string): Promise<ProbePayload> {
  return fetchProbe(mode, {
    next: {
      revalidate: 60,
    },
  });
}

export async function getProbeWithUseCache(mode: string): Promise<ProbePayload> {
  "use cache";

  cacheLife("minutes");
  cacheTag(`cache-probe:${mode}`);

  return fetchProbe(mode);
}

export function renderProbePage(
  title: string,
  description: string,
  payload: ProbePayload
): React.JSX.Element {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Cache Verification
          </p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            {description}
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <pre
            id="probe-payload"
            className="overflow-x-auto whitespace-pre-wrap break-all text-sm text-slate-100"
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
