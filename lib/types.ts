// ------------------------------------------------------------
// 入金消込デモのドメイン型定義（指示書 §3・§5）
// ------------------------------------------------------------

export type Role = "staff" | "manager";

// ---- 請求（債権） ----

export type InvoiceStatus =
  | "folder" // 請求書フォルダ内（未取込）
  | "open" // 債権台帳に登録済み・未消込
  | "in_review" // 目検キューで確認中（入金候補が紐付いている）
  | "pending_approval" // 上長承認待ちの処理に含まれる
  | "cleared_auto" // 自動消込済み
  | "cleared_manual"; // 目検・承認を経て消込済み

export type Invoice = {
  invoiceNo: string;
  customerName: string;
  customerKana: string; // 正式名の読み（突合に使用）
  representativeKana: string | null; // 代表者名カナ（個人名義検知用）
  amount: number; // 税込請求額
  issueDate: string; // ISO
  dueDate: string; // ISO
  staffName: string; // 担当営業（""=欠損）
  fileName: string; // 取込元ファイル名
  fileKind: "pdf" | "csv";
  status: InvoiceStatus;
  warning: string | null; // 取込時の警告（欠損補完など）
  clearedBy: string | null; // 消込実行者
  clearedAtLabel: string | null; // 消込日時ラベル
  paymentIds: string[]; // 紐付いた入金
};

// ---- 入金（銀行明細） ----

export type PaymentStatus =
  | "unfetched" // FB未取得
  | "unmatched" // 取込済み・突合前
  | "matched_auto" // 自動消込済み
  | "in_review" // 要目検
  | "pending_approval" // 上長承認待ち
  | "matched_manual" // 目検・承認を経て消込済み
  | "unapplied" // 保留（不明入金）
  | "transferred"; // 仮受金へ振替済み

export type Payment = {
  id: string;
  paymentDate: string; // ISO
  payerNameRaw: string; // 振込名義（全銀カナ）
  amount: number;
  bankName: string;
  status: PaymentStatus;
  matchedInvoiceNos: string[];
};

// ---- 突合エンジン ----

export type MatchType =
  | "exact" // B-1 完全一致
  | "fee_tolerance" // B-2 手数料差
  | "name_fuzzy" // B-3 あいまい名義
  | "old_name" // B-3 旧社名辞書
  | "learned" // D-3 学習済み辞書（自動一致）
  | "aggregate" // B-4 合算入金
  | "personal" // 個人名義（代表者）
  | "combined" // 名義ゆれ + 手数料差の複合
  | "overpayment" // B-5 過入金
  | "partial" // 一部入金の可能性
  | "unknown"; // 紐付けなし

export type MatchCandidate = {
  invoiceNos: string[]; // 合算は複数
  matchType: MatchType;
  score: number; // 0-100
  nameSimilarity: number; // 0-1
  amountDiff: number; // 入金額 − 請求合計（負=不足）
  feeAssumed: boolean; // 差額を振込手数料とみなすか
  reasons: string[]; // 人間が読める判断根拠（D-2）
  normalizedPayer: string;
  dictHit: { from: string; to: string; kind: DictKind } | null;
};

export type MatchClassification = "auto" | "review" | "unapplied";

export type MatchResult = {
  paymentId: string;
  classification: MatchClassification;
  best: MatchCandidate | null;
  alternates: MatchCandidate[];
  remandComment: string | null; // 上長からの差戻しコメント
};

export type MatchSettings = {
  approvalThreshold: number; // これ以上の値引・振替は上長承認（F-1）
  feeTolerances: number[]; // 手数料とみなす差額（B-2）
  autoThreshold: number; // 自動消込スコア（95）
  reviewMin: number; // 要目検の下限スコア（60）
};

// ---- 名義ゆれ辞書 ----

export type DictKind = "old_name" | "kana_alias" | "personal" | "learned";

export type NameDictEntry = {
  id: string;
  from: string; // 正規化後の名義（カナ）
  to: string; // 正式取引先名
  kind: DictKind;
  addedBy: "seed" | "user";
  note: string | null;
};

// ---- 消込ログ・仕訳・監査（C） ----

export type ClearingRecord = {
  id: string; // CLR-001
  executedAtLabel: string;
  executedBy: string; // "AI自動消込" / "経理担当 佐藤 美咲" など
  method: "auto" | "manual" | "approval";
  invoiceNos: string[];
  paymentId: string;
  clearedAmount: number; // 消し込んだ売掛金額
  feeAmount: number; // 手数料充当額
  transferAmount: number; // 仮受金等への振替額
  score: number;
  basis: string; // 照合根拠（自然言語）
};

export type JournalLine = { account: string; amount: number };

export type JournalEntry = {
  id: string; // JRN-001
  date: string; // デモ内日付
  debits: JournalLine[];
  credits: JournalLine[];
  memo: string;
  clearingId: string | null;
};

export type AuditActor = "ai" | "system" | "staff" | "manager";

export type AuditEvent = {
  id: number;
  atLabel: string; // HH:mm:ss（実時刻）
  demoDate: string; // デモ内日付
  actor: AuditActor;
  action: string;
  message: string;
  refId: string | null;
};

// ---- 承認ワークフロー（F） ----

export type ApprovalType = "overpay_transfer" | "suspense_receipt" | "discount_clear";

export type ApprovalRequest = {
  id: string;
  type: ApprovalType;
  title: string;
  detail: string;
  amount: number; // 承認対象の処理金額（差額・振替額）
  paymentId: string | null;
  invoiceNos: string[];
  requestedBy: string;
  requestedOnDemoDate: string;
  status: "waiting" | "approved" | "rejected" | "remanded";
  decisionComment: string | null;
  decidedOnDemoDate: string | null;
};

// ---- 督促（E） ----

export type DunningStatus = "target" | "drafted" | "sent" | "opened" | "replied" | "no_reaction";

export type DunningCase = {
  invoiceNo: string;
  status: DunningStatus;
  draft: { to: string; subject: string; body: string } | null;
  sentOnDemoDate: string | null;
  remindCount: number;
};

// ---- トースト ----

export type Toast = { id: number; message: string; tone: "info" | "success" | "warn" };
