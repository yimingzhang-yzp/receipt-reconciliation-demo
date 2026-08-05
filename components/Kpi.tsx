import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Sparkline, CHART } from "@/components/charts";

type Tone = "default" | "brand" | "amber" | "red" | "emerald" | "info";

const TONE: Record<Tone, { icon: string; spark: string }> = {
  default: { icon: "bg-surface-sunken text-ink-muted", spark: CHART.slate },
  brand: { icon: "bg-brand-50 text-brand-600", spark: CHART.brand },
  amber: { icon: "bg-amber-50 text-amber-600", spark: CHART.amber },
  red: { icon: "bg-rose-50 text-rose-600", spark: CHART.rose },
  emerald: { icon: "bg-emerald-50 text-emerald-600", spark: CHART.emerald },
  info: { icon: "bg-brand-50 text-brand-600", spark: CHART.brand },
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  icon,
  trend,
  spark,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  /** トレンド: 上昇=緑 / 下降=赤 */
  trend?: { dir: "up" | "down"; value: string };
  /** スパークライン用の系列 */
  spark?: number[];
  /** 重要KPI (淡ブルー背景で強調) */
  accent?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`rounded-[13px] border p-5 shadow-card transition-all duration-150 ease-smooth hover:-translate-y-px hover:shadow-pop ${
        accent ? "border-brand-200 bg-brand-50/60" : "border-surface-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-muted">{label}</span>
        {icon ? (
          <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${t.icon}`} aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end gap-2.5">
        <span className="text-[31px] font-bold leading-none tracking-tightish tabular-nums text-ink">{value}</span>
        {trend ? (
          <span
            className={`mb-0.5 inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums ${
              trend.dir === "up" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <Icon name="trendingUp" className={`h-3.5 w-3.5 ${trend.dir === "down" ? "rotate-180" : ""}`} strokeWidth={2.2} />
            {trend.value}
          </span>
        ) : null}
      </div>
      {sub ? <div className="mt-1.5 text-xs text-ink-muted">{sub}</div> : null}
      {spark && spark.length > 1 ? (
        <div className="mt-3 -mb-1">
          <Sparkline data={spark} color={t.spark} height={34} />
        </div>
      ) : null}
    </div>
  );
}
