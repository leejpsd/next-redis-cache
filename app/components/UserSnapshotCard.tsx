import Image from "next/image";
import type { RandomUserPayload } from "../lib/getRandomUser";

type UserSnapshotCardProps = {
  title: string;
  eyebrow: string;
  description: string;
  refreshLabel: string;
  refreshHint: string;
  badge: string;
  badgeTone: "emerald" | "stone";
  data: RandomUserPayload;
  payloadId: string;
};

export function UserSnapshotCard({
  title,
  eyebrow,
  description,
  refreshLabel,
  refreshHint,
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
      ? "border-emerald-700/10 bg-emerald-50/90 text-emerald-900"
      : "border-stone-300/80 bg-white/90 text-stone-800";
  const badgeDotClass = badgeTone === "emerald" ? "bg-emerald-600" : "bg-stone-500";

  return (
    <section className="glass-card equal-card flex h-full flex-col rounded-[2rem] p-6 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {eyebrow}
          </p>
        </div>

        <div
          className={`inline-flex min-w-[132px] flex-col items-start gap-1 self-start rounded-[1rem] border px-3 py-2 text-xs font-medium ${badgeClass}`}
        >
          <span className="flex items-center gap-2 leading-none">
            <span className={`h-2 w-2 rounded-full ${badgeDotClass}`} />
            <span className="uppercase tracking-[0.14em]">{badge}</span>
          </span>
          <span className="font-mono leading-none text-stone-700">{generatedAt}</span>
        </div>
      </div>

      <div className="min-h-[5rem]">
        <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-stone-950 sm:text-[2.2rem]">
          {title}
        </h2>
      </div>

      <div className="min-h-[4rem]">
        <p className="max-w-xl text-sm leading-6 text-stone-600">{description}</p>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <div className="grid min-h-[8rem] gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-stone-300/80 ring-offset-4 ring-offset-[#f7f2ea]">
              <Image
                src={user.picture.large}
                alt={fullName}
                fill
                sizes="80px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <div>
              <h3 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-stone-950">
                {fullName}
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                {user.nat} · 나이 {user.dob.age}세 · 가입 {user.registered.age}
                년차
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto rounded-[1.4rem] border border-stone-300/75 bg-white/70 px-4 py-3.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Refresh Behavior
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-stone-900">
            {refreshLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">{refreshHint}</p>
        </div>
      </div>

      <pre id={payloadId} className="sr-only">
        {JSON.stringify(diagnostics)}
      </pre>
    </section>
  );
}
