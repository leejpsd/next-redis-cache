import Image from "next/image";
import { getRandomUser } from "../lib/getRandomUser";

export default async function UserProfile() {
  const data = await getRandomUser();
  const user = data.results[0];
  const generatedBy = data.generatedBy;
  const diagnostics = {
    fetchedAt: data.fetchedAt,
    source: data.source,
    generatedBy,
    email: user.email,
  };

  const fullName = `${user.name.title} ${user.name.first} ${user.name.last}`;
  const cityCountry = `${user.location.city}, ${user.location.country}`;
  const street = `${user.location.street.name} ${user.location.street.number}`;
  const dob = new Date(user.dob.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const registered = new Date(user.registered.date).toLocaleDateString(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
  const generatedAt = new Date(data.fetchedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <section className="glass-card equal-card rounded-[2rem] p-7 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Shared Cache Result</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            Cached random user
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
            메인 카드가 여러 ECS task에서 동일하게 보이면 메인 `random-user`
            캐시가 Redis에 저장되어 중앙화된 상태입니다.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-900/5 px-3 py-1.5 text-xs font-medium text-emerald-900">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          generated at {generatedAt}
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
                Address
              </dt>
              <dd className="mt-2 font-medium text-stone-950">
                {street}
                <br />
                {cityCountry}
              </dd>
            </div>
            <div className="metric-card rounded-2xl p-4">
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Dates
              </dt>
              <dd className="mt-2 font-medium text-stone-950">
                <span className="block">생일: {dob}</span>
                <span className="mt-1 block text-xs text-stone-500">
                  가입: {registered}
                </span>
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 font-mono text-stone-700">
              TZ {user.location.timezone.offset} ·{" "}
              {user.location.timezone.description}
            </span>
            <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 font-mono text-stone-700">
              lat {user.location.coordinates.latitude}, lng{" "}
              {user.location.coordinates.longitude}
            </span>
            <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 font-mono text-stone-700">
              cache by {generatedBy.instanceId}
            </span>
            <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5 font-mono text-stone-700">
              boot {generatedBy.bootId.slice(0, 8)} · pid {generatedBy.pid}
            </span>
          </div>
        </div>
      </div>
      <pre id="random-user-payload" className="sr-only">
        {JSON.stringify(diagnostics)}
      </pre>
    </section>
  );
}
