import { PrefetchArrivalReporter } from "./PrefetchArrivalReporter";

export default function PrefetchTargetPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto w-full max-w-xl">
        <PrefetchArrivalReporter />
      </div>
    </main>
  );
}
