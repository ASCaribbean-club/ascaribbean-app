import { CollectionProgressBar } from "../../components/CollectionProgressBar";

interface CollectionCardProps {
  collected: string;
  due: string;
  percent: number;
  remaining: string;
}

export function CollectionCard({
  collected,
  due,
  percent,
  remaining,
}: CollectionCardProps) {
  return (
    <section
      aria-label="Cotisations encaissées"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4.5"
    >
      <h2 className="text-[11.5px] font-bold tracking-wider text-coach-green-label uppercase">
        Cotisations encaissées
      </h2>
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[28px] leading-none font-black text-white">
          {collected}{" "}
          <span className="text-[14px] font-semibold text-white/60">
            sur {due}
          </span>
        </p>
        <span className="shrink-0 text-[16px] font-extrabold text-white">
          {percent}%
        </span>
      </div>
      <CollectionProgressBar
        percent={percent}
        label={`${percent}% des cotisations encaissées`}
      />
      <p className="text-[13px] font-semibold text-white/60">
        Reste à percevoir :{" "}
        <span className="font-extrabold text-amber-400">{remaining}</span>
      </p>
    </section>
  );
}
