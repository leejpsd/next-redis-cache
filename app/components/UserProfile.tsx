import Image from "next/image";
import { getRandomUser } from "../lib/getRandomUser";

export default async function UserProfile() {
  const data = await getRandomUser();
  const user = data.results[0];
  const generatedBy = data.generatedBy;

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

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-950/50">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* 왼쪽: 프로필 이미지 */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-900">
            <Image
              src={user.picture.large}
              alt={fullName}
              fill
              sizes="112px"
              className="object-cover"
              priority
            />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            캐시된 랜덤 유저
          </span>
        </div>

        {/* 오른쪽: 상세 정보 */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-semibold leading-tight">{fullName}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {user.nat} · 나이 {user.dob.age}세 · 가입 {user.registered.age}
              년차
            </p>
          </div>

          {/* 메타 정보 그리드 */}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">이메일</dt>
              <dd className="font-medium break-all text-slate-50">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">전화번호</dt>
              <dd className="font-medium text-slate-50">{user.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-400">주소</dt>
              <dd className="font-medium text-slate-50">
                {street}
                <br />
                {cityCountry}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">생년월일 / 가입일</dt>
              <dd className="font-medium text-slate-50">
                <span className="block">생일: {dob}</span>
                <span className="block text-slate-400 text-xs">
                  가입: {registered}
                </span>
              </dd>
            </div>
          </dl>

          {/* 타임존 & 좌표 */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 font-mono text-slate-300">
              TZ {user.location.timezone.offset} ·{" "}
              {user.location.timezone.description}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 font-mono text-slate-300">
              lat {user.location.coordinates.latitude}, lng{" "}
              {user.location.coordinates.longitude}
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-700/70 bg-emerald-500/10 px-2.5 py-1 font-mono text-emerald-200">
              source {data.source}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 font-mono text-slate-300">
              cache by {generatedBy.instanceId}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 font-mono text-slate-300">
              boot {generatedBy.bootId.slice(0, 8)} · pid {generatedBy.pid}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
