import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

// ------------------------------------------------------------
// AIProcessingSteps — 縦型ステップ (ライト面用)
// ------------------------------------------------------------
export function AIProcessingSteps({
  steps,
  current,
  running = false,
}: {
  steps: string[];
  current: number;
  running?: boolean;
}) {
  return (
    <ol className="relative">
      {steps.map((label, i) => {
        const done = i < current || (!running && current >= steps.length);
        const active = running && i === current;
        const isLast = i === steps.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${done ? "bg-emerald-300" : "bg-line"}`} aria-hidden />
            )}
            <span className="relative z-10 mt-0.5 flex h-6 w-6 flex-none items-center justify-center">
              {done ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="checkCircle" className="h-4 w-4" strokeWidth={2.2} />
                </span>
              ) : active ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                </span>
              )}
            </span>
            <span className={`pt-px leading-6 ${active ? "text-[17px] font-semibold text-ink" : done ? "text-[15px] text-ink-soft" : "text-[15px] text-ink-faint"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------
// AIResultSummary — 完了サマリー (ネイビーの総評カード)
// ------------------------------------------------------------
type SummaryStat = { label: string; value: ReactNode; tone?: "default" | "emerald" | "amber" | "cyan" | "rose" };
const STAT_TONE: Record<NonNullable<SummaryStat["tone"]>, string> = {
  default: "text-white",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  cyan: "text-accent-300",
  rose: "text-rose-300",
};

export function AIResultSummary({ title, subtitle, stats }: { title: ReactNode; subtitle?: ReactNode; stats: SummaryStat[] }) {
  return (
    <div className="surface-cover relative overflow-hidden rounded-2xl border border-white/10 shadow-navy">
      <span className="accent-line pointer-events-none absolute inset-x-0 top-0 h-[3px]" aria-hidden />
      <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="ai-gradient mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white shadow-glow-cyan">
            <Icon name="sparkles" className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="neon-cyan text-xl font-bold leading-snug tracking-tightish text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-[13px] leading-relaxed text-[#B7C7D8]">{subtitle}</p> : null}
          </div>
        </div>
        {stats.length > 0 && (
          <div className="flex flex-none flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-[11px] font-medium uppercase tracking-wide text-[#8397AB]">{s.label}</div>
                <div className={`mt-1 text-2xl font-bold tabular-nums ${STAT_TONE[s.tone ?? "default"]}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ProcessPipeline — 処理全体の進捗 (ライト)
// ------------------------------------------------------------
export type PipelineStage = { key: string; label: string; count: number };
export function ProcessPipeline({ stages }: { stages: PipelineStage[] }) {
  const max = stages[0]?.count || 1;
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {stages.map((s, i) => {
        const isLast = i === stages.length - 1;
        const ratio = Math.round((s.count / max) * 100);
        const complete = isLast && s.count > 0;
        return (
          <div key={s.key} className="flex flex-1 items-stretch gap-2">
            <div className="flex-1 rounded-lg border border-surface-border bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="whitespace-nowrap text-[13px] font-medium text-ink-soft">{s.label}</span>
                <span className={`text-xl font-bold tabular-nums ${complete ? "text-emerald-600" : "text-brand-600"}`}>{s.count}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
                <div className={`h-full rounded-full ${complete ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${ratio}%` }} />
              </div>
            </div>
            {!isLast && (
              <span className="flex items-center text-ink-faint" aria-hidden>
                <Icon name="chevronRight" className="h-4 w-4" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// AiOrbHero — シネマティックなAI処理ヒーロー (発光オーブ＋リング＋オービット)
// ------------------------------------------------------------
export function AiOrbHero({
  title,
  subtitle,
  steps,
  current,
  running,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  steps: string[];
  current: number;
  running: boolean;
}) {
  const total = steps.length;
  const shown = Math.min(current, total);
  const percent = Math.min(100, Math.round(((running ? shown : total) / total) * 100));
  return (
    <div className="surface-cover relative overflow-hidden rounded-2xl border border-white/10 px-6 py-10 shadow-navy">
      {/* アンビエントグロー */}
      <span className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle,rgba(0,175,236,0.5),transparent 70%)" }} aria-hidden />
      <span className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle,rgba(0,108,191,0.55),transparent 70%)" }} aria-hidden />

      <div className="relative flex flex-col items-center gap-6">
        {/* オーブ + リング + オービット */}
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full border border-accent-400/40 animate-ring" aria-hidden />
          <span className="absolute h-24 w-24 rounded-full border border-accent-400/40 animate-ring [animation-delay:1.2s]" aria-hidden />
          <span className="absolute h-40 w-40 animate-orbit" aria-hidden>
            <span className="absolute inset-0 rounded-full border border-dashed border-accent-400/25" />
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-accent-400 shadow-glow-cyan" />
          </span>
          <span className="absolute h-32 w-32 animate-orbit-rev" aria-hidden>
            <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-300" />
          </span>
          <span className="ai-gradient relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-glow-cyan animate-glow-pulse">
            <Icon name="sparkles" className="h-9 w-9" strokeWidth={2} />
          </span>
        </div>

        <div className="text-center">
          <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-accent-300">AI MATCHING IN PROGRESS</div>
          <h2 className="neon-cyan mt-1.5 text-2xl font-bold tracking-tightish text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] text-[#B7C7D8]">{subtitle}</p> : null}
        </div>

        {/* 進捗バー */}
        <div className="w-full max-w-md">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-[#B7C7D8]">
            <span>ステップ {Math.min(shown + (running ? 1 : 0), total)}/{total}</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="ai-gradient h-full rounded-full transition-all duration-300 ease-smooth" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {/* ガラスのステップパネル */}
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
          <ol className="space-y-2.5">
            {steps.map((label, i) => {
              const done = i < current || !running;
              const active = running && i === current;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-none items-center justify-center">
                    {done ? (
                      <Icon name="checkCircle" className="h-5 w-5 text-emerald-300" strokeWidth={2.2} />
                    ) : active ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-400/40 border-t-accent-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                    )}
                  </span>
                  <span className={active ? "text-[15px] font-semibold text-white" : done ? "text-sm text-[#B7C7D8]" : "text-sm text-[#6E8095]"}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
