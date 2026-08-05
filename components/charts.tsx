import type { ReactNode } from "react";

// PMG配色パレット
export const CHART = {
  brand: "#006CBF",
  navy: "#123A5E",
  sky: "#5EA9E6",
  deep: "#0A4680",
  cyan: "#00AFEC",
  amber: "#E08A00",
  slate: "#8493A5",
  emerald: "#16A34A",
  rose: "#DC2626",
  orange: "#EA7317",
  grid: "#E4ECF4",
  axis: "#8493A5",
  ink: "#16375A",
  track: "#EDF3F9",
};
export const SERIES = [CHART.brand, CHART.navy, CHART.sky, CHART.deep, CHART.amber, CHART.slate];

type Point = { label: string; value: number };

// ------------------------------------------------------------
// Sparkline — KPI用の極小エリアチャート
// ------------------------------------------------------------
export function Sparkline({ data, color = CHART.brand, height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const W = 160;
  const H = height;
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (H - pad * 2) * (1 - (v - min) / range);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.6} fill={color} />
    </svg>
  );
}

// ------------------------------------------------------------
// Gauge — 半円ゲージ (消込率など)
// ------------------------------------------------------------
export function Gauge({ value, size = 168, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const circ = Math.PI * r; // 半円
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`} role="img" aria-label="ゲージ">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0C56A0" />
            <stop offset="55%" stopColor="#006CBF" />
            <stop offset="100%" stopColor="#00AFEC" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={CHART.track} strokeWidth={13} strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={`${(circ * pct).toFixed(1)} ${circ.toFixed(1)}`}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="30" fontWeight="700" fill={CHART.ink}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label ? <div className="mt-1 text-[13px] text-ink-muted">{label}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------
// VBarChart (縦棒)
// ------------------------------------------------------------
export function VBarChart({
  data,
  color = CHART.brand,
  colors,
  height = 200,
  format = (v) => v.toLocaleString(),
}: {
  data: Point[];
  color?: string;
  colors?: string[];
  height?: number;
  format?: (v: number) => string;
}) {
  const W = 640;
  const H = height;
  const padT = 24, padB = 26;
  const innerH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const n = data.length;
  const slot = W / n;
  const bw = Math.min(64, slot * 0.5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label="棒グラフ">
      <line x1={0} x2={W} y1={padT + innerH} y2={padT + innerH} stroke={CHART.grid} strokeWidth={1} />
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * innerH);
        const cx = i * slot + slot / 2;
        const barColor = colors?.[i] ?? color;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={padT + innerH - h} width={bw} height={h} rx={3} fill={barColor} opacity={0.9} />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="12" fill={CHART.axis}>{d.label}</text>
            <text x={cx} y={padT + innerH - h - 7} textAnchor="middle" fontSize="12" fontWeight="700" fill={CHART.ink}>
              {format(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ------------------------------------------------------------
// DonutChart (構成比)
// ------------------------------------------------------------
type Slice = { label: string; value: number; color: string };
export function DonutChart({ data, size = 168, centerLabel, centerValue }: { data: Slice[]; size?: number; centerLabel?: string; centerValue?: ReactNode }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const stroke = 22;
  const radius = r - stroke / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none" role="img" aria-label="構成比グラフ">
        <g transform={`rotate(-90 ${r} ${r})`}>
          <circle cx={r} cy={r} r={radius} fill="none" stroke={CHART.track} strokeWidth={stroke} />
          {data.map((d, i) => {
            const len = (d.value / total) * circ;
            const el = (
              <circle key={i} cx={r} cy={r} r={radius} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
        {centerValue !== undefined && (
          <>
            <text x={r} y={r - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill={CHART.ink}>{centerValue as string}</text>
            {centerLabel && <text x={r} y={r + 16} textAnchor="middle" fontSize="11" fill={CHART.axis}>{centerLabel}</text>}
          </>
        )}
      </svg>
      <ul className="flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-ink-soft">{d.label}</span>
            <span className="tabular-nums text-ink-muted">{d.value}件</span>
            <span className="w-12 text-right font-medium tabular-nums text-ink">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------
// HBarChart (横棒・ランキング)
// ------------------------------------------------------------
export function HBarChart({
  data,
  format = (v) => v.toLocaleString(),
  emptyLabel = "データがありません",
}: {
  data: { label: string; value: number; color?: string }[];
  format?: (v: number) => string;
  emptyLabel?: string;
}) {
  if (data.length === 0) return <p className="py-6 text-center text-sm text-ink-faint">{emptyLabel}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, idx) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-[13px] text-ink-soft" title={d.label}>{d.label}</span>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, (d.value / max) * 100)}%`, backgroundColor: d.color ?? (idx === 0 ? CHART.brand : CHART.sky) }} />
            </div>
            <span className="w-24 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">{format(d.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
