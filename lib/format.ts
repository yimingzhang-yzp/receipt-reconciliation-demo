// ------------------------------------------------------------
// 表示ラベル・配色・フォーマッタ（緑/黄/グレー/赤の意味色で統一 §6）
// ------------------------------------------------------------

import type {
  ApprovalType,
  AuditActor,
  DictKind,
  DunningStatus,
  InvoiceStatus,
  MatchClassification,
  MatchType,
  PaymentStatus,
} from "./types";
import type { AgingBucket } from "./matching";

export { formatDate, formatDateShort } from "./dates";

export function yen(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "¥" + n.toLocaleString("ja-JP");
}

/** 分を「X時間Y分」表記に */
export function fmtDuration(min: number): string {
  if (min <= 0) return "0分";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}時間${m > 0 ? `${m}分` : ""}` : `${m}分`;
}

// ---- 分類（緑/黄/グレー/赤） ----

export const CLASSIFICATION_LABEL: Record<MatchClassification | "dunning", string> = {
  auto: "自動消込",
  review: "要目検",
  unapplied: "保留",
  dunning: "督促対象",
};

export const CLASSIFICATION_STYLE: Record<MatchClassification | "dunning", { chip: string; dot: string }> = {
  auto: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  review: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  unapplied: { chip: "bg-surface-sunken text-ink-soft border-line", dot: "bg-ink-faint" },
  dunning: { chip: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};

// ---- 請求ステータス ----

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  folder: "未取込",
  open: "未消込",
  in_review: "目検中",
  pending_approval: "上長承認待ち",
  cleared_auto: "消込済（自動）",
  cleared_manual: "消込済（目検）",
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, { chip: string; dot: string }> = {
  folder: { chip: "bg-surface-sunken text-ink-soft border-line", dot: "bg-ink-faint" },
  open: { chip: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500" },
  in_review: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  pending_approval: { chip: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500" },
  cleared_auto: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cleared_manual: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

// ---- 入金ステータス ----

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unfetched: "未取得",
  unmatched: "突合前",
  matched_auto: "自動消込済",
  in_review: "要目検",
  pending_approval: "上長承認待ち",
  matched_manual: "消込済（目検）",
  unapplied: "保留",
  transferred: "仮受金振替済",
};

export const PAYMENT_STATUS_STYLE: Record<PaymentStatus, { chip: string; dot: string }> = {
  unfetched: { chip: "bg-surface-sunken text-ink-soft border-line", dot: "bg-ink-faint" },
  unmatched: { chip: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500" },
  matched_auto: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  in_review: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  pending_approval: { chip: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500" },
  matched_manual: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  unapplied: { chip: "bg-surface-sunken text-ink-soft border-line", dot: "bg-ink-faint" },
  transferred: { chip: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500" },
};

// ---- 突合タイプ ----

export const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  exact: "完全一致",
  fee_tolerance: "手数料差",
  name_fuzzy: "名義ゆれ",
  old_name: "旧社名",
  learned: "学習済み一致",
  aggregate: "合算入金",
  personal: "個人名義",
  combined: "名義ゆれ+手数料",
  overpayment: "過入金",
  partial: "一部入金",
  unknown: "不明",
};

// ---- スコア配色（95以上=緑 / 60〜94=黄 / それ未満=グレー） ----

export function scoreChip(score: number): string {
  if (score >= 95) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-surface-sunken text-ink-soft border-line";
}

// ---- エイジング（B-6） ----

export const AGING_LABEL: Record<AgingBucket, string> = {
  b30: "〜30日",
  b60: "31〜60日",
  b61plus: "61日〜",
};

export const AGING_STYLE: Record<AgingBucket, string> = {
  b30: "bg-amber-50 text-amber-700 border-amber-200",
  b60: "bg-orange-50 text-orange-700 border-orange-200",
  b61plus: "bg-rose-50 text-rose-700 border-rose-200",
};

// ---- 督促トレース（E-2） ----

export const DUNNING_STATUS_LABEL: Record<DunningStatus, string> = {
  target: "未送信",
  drafted: "文面作成済み",
  sent: "送信済み",
  opened: "開封",
  replied: "返信あり",
  no_reaction: "無反応",
};

export const DUNNING_STATUS_STYLE: Record<DunningStatus, string> = {
  target: "bg-rose-50 text-rose-700 border-rose-200",
  drafted: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-brand-50 text-brand-700 border-brand-200",
  opened: "bg-brand-50 text-brand-700 border-brand-200",
  replied: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no_reaction: "bg-orange-50 text-orange-700 border-orange-200",
};

// ---- 辞書・承認・実行者 ----

export const DICT_KIND_LABEL: Record<DictKind, string> = {
  old_name: "旧社名",
  kana_alias: "カナ別名",
  personal: "個人名義",
  learned: "学習済み",
};

export const DICT_KIND_STYLE: Record<DictKind, string> = {
  old_name: "bg-brand-50 text-brand-700 border-brand-200",
  kana_alias: "bg-surface-sunken text-ink-soft border-line",
  personal: "bg-orange-50 text-orange-700 border-orange-200",
  learned: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const APPROVAL_TYPE_LABEL: Record<ApprovalType, string> = {
  overpay_transfer: "過入金の振替消込",
  suspense_receipt: "不明入金の仮受金計上",
  discount_clear: "値引消込",
};

export const METHOD_LABEL: Record<"auto" | "manual" | "approval", string> = {
  auto: "AI自動",
  manual: "目検確認",
  approval: "上長承認",
};

export const METHOD_STYLE: Record<"auto" | "manual" | "approval", string> = {
  auto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  manual: "bg-amber-50 text-amber-700 border-amber-200",
  approval: "bg-brand-50 text-brand-700 border-brand-200",
};

export const ACTOR_LABEL: Record<AuditActor, string> = {
  ai: "AI",
  system: "システム",
  staff: "経理担当",
  manager: "上長",
};

export const ACTOR_STYLE: Record<AuditActor, { chip: string; dot: string }> = {
  ai: { chip: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-accent-500" },
  system: { chip: "bg-surface-sunken text-ink-soft border-line", dot: "bg-ink-faint" },
  staff: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  manager: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
