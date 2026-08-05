import {
  ACTOR_LABEL,
  ACTOR_STYLE,
  AGING_LABEL,
  AGING_STYLE,
  ALIAS_KIND_LABEL,
  ALIAS_KIND_STYLE,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_STYLE,
  DUNNING_STATUS_LABEL,
  DUNNING_STATUS_STYLE,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_STYLE,
  MATCH_TYPE_LABEL,
  METHOD_LABEL,
  METHOD_STYLE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  scoreChip,
} from "@/lib/format";
import { agingBucket } from "@/lib/matching";
import type {
  AliasKind,
  AuditActor,
  DunningStatus,
  InvoiceStatus,
  MatchClassification,
  MatchType,
  PaymentStatus,
} from "@/lib/types";
import { Icon } from "@/components/icons";

const chipBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium whitespace-nowrap";

const chipSm =
  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap";

export function ClassificationBadge({ value, animated }: { value: MatchClassification | "dunning"; animated?: boolean }) {
  const s = CLASSIFICATION_STYLE[value];
  return (
    <span className={`${chipBase} ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${animated ? "animate-pulse-soft" : ""}`} />
      {CLASSIFICATION_LABEL[value]}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const s = INVOICE_STATUS_STYLE[status];
  return (
    <span className={`${chipBase} ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {INVOICE_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS_STYLE[status];
  return (
    <span className={`${chipBase} ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

/** スコアバッジ（95以上=緑 / 60〜94=黄 / 未満=グレー） */
export function ScoreBadge({ score }: { score: number }) {
  return <span className={`${chipBase} tabular-nums ${scoreChip(score)}`}>スコア {score}</span>;
}

export function MatchTypeBadge({ type }: { type: MatchType }) {
  return <span className={`${chipSm} border-line bg-surface-sunken text-ink-soft`}>{MATCH_TYPE_LABEL[type]}</span>;
}

/** 期日超過日数のエイジングバッジ（〜30/31〜60/61〜） */
export function AgingBadge({ overdueDays }: { overdueDays: number }) {
  const b = agingBucket(overdueDays);
  return (
    <span className={`${chipBase} tabular-nums ${AGING_STYLE[b]}`}>
      {overdueDays}日超過（{AGING_LABEL[b]}）
    </span>
  );
}

export function DunningStatusBadge({ status }: { status: DunningStatus }) {
  return <span className={`${chipBase} ${DUNNING_STATUS_STYLE[status]}`}>{DUNNING_STATUS_LABEL[status]}</span>;
}

export function AliasKindBadge({ kind }: { kind: AliasKind }) {
  return <span className={`${chipSm} ${ALIAS_KIND_STYLE[kind]}`}>{ALIAS_KIND_LABEL[kind]}</span>;
}

export function MethodBadge({ method }: { method: "auto" | "manual" | "approval" }) {
  return <span className={`${chipSm} ${METHOD_STYLE[method]}`}>{METHOD_LABEL[method]}</span>;
}

export function ActorBadge({ actor }: { actor: AuditActor }) {
  const s = ACTOR_STYLE[actor];
  return (
    <span className={`${chipSm} ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {ACTOR_LABEL[actor]}
    </span>
  );
}

/** 警告バッジ（取込バリデーション A-4） */
export function WarnBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${chipSm} border-amber-200 bg-amber-50 text-amber-700`}>
      <Icon name="alertTriangle" className="h-3 w-3" strokeWidth={2} />
      {children}
    </span>
  );
}

/** AIエージェントのアバター (コバルトグラデーション+グロー) */
export function AgentAvatar({ size = "h-9 w-9", pulse = false, className = "" }: { size?: string; pulse?: boolean; className?: string }) {
  return (
    <span
      className={`ai-gradient inline-flex items-center justify-center rounded-xl text-white shadow-glow-sm ${pulse ? "animate-glow-pulse" : ""} ${size} ${className}`}
      aria-hidden
    >
      <Icon name="sparkles" className="h-1/2 w-1/2" strokeWidth={2} />
    </span>
  );
}
