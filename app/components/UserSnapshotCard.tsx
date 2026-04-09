import Image from "next/image";
import type { RandomUserPayload } from "../lib/getRandomUser";

type UserSnapshotCardProps = {
  title: string;
  eyebrow: string;
  description: string;
  badge: string;
  badgeTone: "emerald" | "stone";
  data: RandomUserPayload;
  payloadId: string;
};

export function UserSnapshotCard({
  title,
  eyebrow,
  description,
  badge,
  badgeTone,
  data,
  payloadId,
}: UserSnapshotCardProps) {
  const user = data.results[0];
  const generatedBy = data.generatedBy;
  const diagnostics = {
    fetchedAt: data.fetchedAt,
    source: data.source,
    generatedBy,
    email: user.email,
  };

  const fullName = `${user.name.title} ${user.name.first} ${user.name.last}`;
  const generatedAt = new Date(data.fetchedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const badgeClass =
    badgeTone === "emerald"
      ? "border-emerald-700/15 bg-emerald-900/5 text-emerald-900"
      : "border-stone-300/80 bg-white/85 text-stone-800";
  const badgeDotClass = badgeTone === "emerald" ? "bg-emerald-600" : "bg-stone-500";

  return (
    <section className="glass-card equal-card rounded-[2rem] p-7 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-stone-950 sm:text-[2.2rem]">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${badgeDotClass}`} />
          {badge} · {generatedAt}
        </div>
      </div>

      <div className="flex flex-col gap-7 sm:flex-row">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-32 w-32 overflow-hidden rounded-full ring-1 ring-stone-300/80 ring-offset-4 ring-offset-[#f7f2ea]">
            <Image
              src={user.picture.large}
              alt={fullName}
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-700">
            <span className="h-2 w-2 rounded-full bg-stone-500" />
            source {data.source}
          </span>
        </div>

        <div className="flex-1 space-y-5">
          <div>
            <h3 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-stone-950">
              {fullName}
            </h3>
            <p className="mt-2 text-sm text-stone-600">
              {user.nat} · 나이 {user.dob.age}세 · 가입 {user.registered.age}
              년차
            </p>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="metric-card rounded-2xl p-4">
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Email
              </dt>
              <dd className="mt-2 break-all font-medium text-stone-950">
                {user.email}
              </dd>
            </div>
            <div className="metric-card rounded-2xl p-4">
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Phone
              </dt>
              <dd className="mt-2 font-medium text-stone-950">{user.phone}</dd>
            </div>
            <div className="metric-card rounded-2xl p-4">
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Runtime
              </dt>
              <dd className="mt-2 font-mono text-sm text-stone-950">
                {generatedBy.instanceId}
              </dd>
            </div>
            <div className="metric-card rounded-2xl p-4">
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Process
              </dt>
              <dd className="mt-2 font-mono text-sm text-stone-950">
                boot {generatedBy.bootId.slice(0, 8)} · pid {generatedBy.pid}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 font-mono text-stone-700">
              cache by {generatedBy.instanceId}
            </span>
            <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 font-mono text-stone-700">
              boot {generatedBy.bootId.slice(0, 8)} · pid {generatedBy.pid}
            </span>
          </div>
        </div>
      </div>

      <pre id={payloadId} className="sr-only">
        {JSON.stringify(diagnostics)}
      </pre>
    </section>
  );
}
