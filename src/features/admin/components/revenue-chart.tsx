import { formatMoney } from '@/lib/money';

/** Dependency-free SVG bar chart for daily revenue. */
export function RevenueChart({
  data,
}: {
  data: { date: string; revenueSen: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.revenueSen));
  const total = data.reduce((s, d) => s + d.revenueSen, 0);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold">Revenue · last {data.length} days</h2>
        <span className="text-sm text-muted-foreground">{formatMoney(total)}</span>
      </div>
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => {
          const pct = Math.round((d.revenueSen / max) * 100);
          return (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                style={{ height: `${Math.max(2, pct)}%` }}
                title={`${d.date}: ${formatMoney(d.revenueSen)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
