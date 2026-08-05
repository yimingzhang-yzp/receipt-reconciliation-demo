// ------------------------------------------------------------
// シードデータ（指示書 §5 + 基幹連携化改修）
//   債権30件は販売管理システム（DemoSales基幹）から連携される「計上済み
//   売掛金の未消込一覧」。入金25件は銀行FBデータ。日付は「今日」基準で相対生成。
//   入金ケース内訳: 完全一致14 / 手数料差4 / 名義ゆれ2 / 合算1 /
//                   名義ゆれ+手数料1 / 不明1 / 過入金1 / 個人名義1
// ------------------------------------------------------------

import type { Customer, Invoice, PayerAlias, Payment } from "./types";
import { normalizePayerName } from "./matching";
import { addDays, diffDays, formatDate } from "./dates";

// 自社・登場人物・連携元システム（すべて架空）
export const COMPANY = {
  selfName: "デモ販売株式会社",
  dept: "経理部",
  staffName: "佐藤 美咲",
  staffLabel: "経理担当 佐藤 美咲",
  managerName: "田中 誠",
  managerLabel: "経理課長 田中 誠",
  aiLabel: "AI自動消込",
};

export const SOURCE_SYSTEM = "販売管理システム（DemoSales基幹）";
export const ACCOUNTING_SYSTEM = "経理システム（DemoLedger会計）";

const STAFFS = ["山本 大輔", "井上 彩", "中村 亮", "木村 沙織", "斎藤 健"];
const BANKS = ["デモ中央銀行", "サンプル銀行", "あけぼの信用金庫"];

type SeedRow = {
  customer: string;
  kana: string; // 正式名の読み
  rep?: string; // 代表者カナ（個人名義検知用）
  amount: number;
  dueAgo: number; // 支払期日 = 今日 − dueAgo 日
  staffMissing?: boolean; // 連携データの欠損補完デモ（A-4）
  pay?: { ago: number; amount?: number; raw: string }; // 対応する入金（無し=未入金）
};

// 債権30件（うち25件は入金あり・5件は期日超過の未入金）
const ROWS: SeedRow[] = [
  // --- 完全一致 ×14（B-1: 名義・金額・日付一致 → 自動消込） ---
  { customer: "ベータ工業株式会社", kana: "ベータコウギョウ", amount: 330000, dueAgo: 8, pay: { ago: 9, raw: "ベータコウギヨウ(カ" } },
  { customer: "株式会社デルタ食品", kana: "デルタショクヒン", amount: 184800, dueAgo: 6, pay: { ago: 7, raw: "カ)デルタシヨクヒン" } },
  { customer: "エータ製薬株式会社", kana: "エータセイヤク", amount: 748000, dueAgo: 12, pay: { ago: 13, raw: "エータセイヤク(カ" } },
  { customer: "株式会社イオタ印刷", kana: "イオタインサツ", amount: 96800, dueAgo: 5, pay: { ago: 5, raw: "カ)イオタインサツ" } },
  { customer: "カッパ精機株式会社", kana: "カッパセイキ", amount: 275000, dueAgo: 15, pay: { ago: 16, raw: "カツパセイキ(カ" } },
  { customer: "株式会社ニュー商会", kana: "ニューショウカイ", amount: 143000, dueAgo: 10, pay: { ago: 11, raw: "カ)ニユーシヨウカイ" } },
  { customer: "オミクロン化成株式会社", kana: "オミクロンカセイ", amount: 561000, dueAgo: 18, pay: { ago: 19, raw: "オミクロンカセイ(カ" } },
  { customer: "株式会社ファイ金属", kana: "ファイキンゾク", amount: 418000, dueAgo: 7, pay: { ago: 8, raw: "カ)フアイキンゾク" } },
  { customer: "カイ機械株式会社", kana: "カイキカイ", amount: 203500, dueAgo: 9, staffMissing: true, pay: { ago: 9, raw: "カイキカイ(カ" } },
  { customer: "株式会社シグマ運輸", kana: "シグマウンユ", amount: 126500, dueAgo: 20, pay: { ago: 21, raw: "カ)シグマウンユ" } },
  { customer: "ウプシロン紙業株式会社", kana: "ウプシロンシギョウ", amount: 88000, dueAgo: 4, pay: { ago: 4, raw: "ウプシロンシギヨウ(カ" } },
  { customer: "株式会社あおば流通", kana: "アオバリュウツウ", amount: 352000, dueAgo: 14, pay: { ago: 15, raw: "カ)アオバリユウツウ" } },
  { customer: "株式会社ひかり産業", kana: "ヒカリサンギョウ", amount: 237600, dueAgo: 11, pay: { ago: 12, raw: "カ)ヒカリサンギヨウ" } },
  { customer: "株式会社みなと精密", kana: "ミナトセイミツ", amount: 469700, dueAgo: 16, pay: { ago: 17, raw: "カ)ミナトセイミツ" } },

  // --- 手数料差 ×4（B-2: 220円 or 440円少ない → 自動消込・手数料控除） ---
  { customer: "株式会社フジ商会", kana: "フジショウカイ", amount: 308000, dueAgo: 6, pay: { ago: 6, amount: 307780, raw: "カ)フジシヨウカイ" } },
  { customer: "株式会社やまびこ物流", kana: "ヤマビコブツリュウ", amount: 165000, dueAgo: 13, pay: { ago: 14, amount: 164780, raw: "カ)ヤマビコブツリユウ" } },
  { customer: "株式会社すみれ食品", kana: "スミレショクヒン", amount: 550000, dueAgo: 9, pay: { ago: 10, amount: 549560, raw: "カ)スミレシヨクヒン" } },
  { customer: "株式会社こだま印刷", kana: "コダマインサツ", amount: 121000, dueAgo: 17, pay: { ago: 18, amount: 120560, raw: "カ)コダマインサツ" } },

  // --- 名義ゆれ ×2（B-3: カナ略記・旧社名 → 要目検） ---
  { customer: "株式会社アルファ商事", kana: "アルファショウジ", amount: 462000, dueAgo: 10, pay: { ago: 11, raw: "カ)アルフア" } },
  { customer: "株式会社ガンマ物流", kana: "ガンマブツリュウ", amount: 286000, dueAgo: 12, pay: { ago: 12, raw: "ガンマウンユ(カ" } },

  // --- 合算入金 ×1（B-4: 2請求を1回の振込で。入金は EXTRA_PAYMENTS 側） ---
  { customer: "株式会社イプシロン物産", kana: "イプシロンブッサン", amount: 93500, dueAgo: 8 },
  { customer: "株式会社イプシロン物産", kana: "イプシロンブッサン", amount: 217800, dueAgo: 8 },

  // --- 名義ゆれ + 手数料差 ×1（複合 → 要目検） ---
  { customer: "シータ電機株式会社", kana: "シータデンキ", amount: 198000, dueAgo: 7, pay: { ago: 8, amount: 197780, raw: "シータデンキハンバイ(カ" } },

  // --- 過入金 ×1（B-5: 請求より多い入金 → 要目検・差額振替は承認へ） ---
  { customer: "タウ電子株式会社", kana: "タウデンシ", amount: 374000, dueAgo: 9, pay: { ago: 10, amount: 506000, raw: "カ)タウデンシ" } },

  // --- 個人名義 ×1（代表者個人の振込 → 要目検） ---
  { customer: "株式会社ミューリテイリング", kana: "ミューリテイリング", rep: "ムラタ ケンイチ", amount: 259600, dueAgo: 5, pay: { ago: 5, raw: "ムラタ ケンイチ" } },

  // --- 未入金 ×5（B-6: 期日超過 → 督促対象。エイジング 〜30/31〜60/61〜 に分散） ---
  { customer: "ゼータ建設株式会社", kana: "ゼータケンセツ", amount: 770000, dueAgo: 68 },
  { customer: "株式会社クサイ興産", kana: "クサイコウサン", amount: 253000, dueAgo: 41 },
  { customer: "パイ産業株式会社", kana: "パイサンギョウ", amount: 94600, dueAgo: 33 },
  { customer: "株式会社ロー技研", kana: "ローギケン", amount: 442200, dueAgo: 18 },
  { customer: "株式会社プサイ食販", kana: "プサイショクハン", amount: 60500, dueAgo: 6 },
];

// 請求に対応しない入金（合算・不明）
const EXTRA_PAYMENTS: { ago: number; amount: number; raw: string }[] = [
  { ago: 9, amount: 311300, raw: "カ)イプシロンブツサン" }, // 合算: 93,500 + 217,800
  { ago: 3, amount: 137500, raw: "ラムダテツコウ(カ" }, // 不明入金（該当請求なし）
];

// 正式名義以外の振込名義（旧社名・カナ別名。連携元マスタ由来 = addedBy: "sync"）
const EXTRA_ALIASES: Record<string, Omit<PayerAlias, "addedBy">[]> = {
  株式会社ガンマ物流: [
    { alias: "ガンマウンユ", kind: "old_name", note: "2024年に社名変更（旧: ガンマ運輸株式会社）" },
  ],
  株式会社アルファ商事: [
    { alias: "アルファショウカイ", kind: "old_name", note: "2022年に社名変更（旧: アルファ商会）" },
  ],
  株式会社みなと精密: [
    { alias: "ミナトセイミツセイサクショ", kind: "kana_alias", note: "旧屋号での振込実績あり" },
  ],
};

// ---- 取引先マスタ（ROWSの初出順に顧客IDを採番。販売管理システムと同期の想定） ----

function uniqueCustomers(): { name: string; kana: string; rep: string | null }[] {
  const seen = new Map<string, { name: string; kana: string; rep: string | null }>();
  for (const r of ROWS) {
    if (!seen.has(r.customer)) seen.set(r.customer, { name: r.customer, kana: r.kana, rep: r.rep ?? null });
  }
  return [...seen.values()];
}

export function buildSeedCustomers(): Customer[] {
  return uniqueCustomers().map((c, i) => {
    const aliases: PayerAlias[] = [
      { alias: normalizePayerName(c.kana), kind: "official", note: "正式社名の読み", addedBy: "sync" },
      ...(EXTRA_ALIASES[c.name] ?? []).map((a) => ({ ...a, alias: normalizePayerName(a.alias), addedBy: "sync" as const })),
    ];
    return {
      customerId: `CUST-${String(i + 1).padStart(3, "0")}`,
      name: c.name,
      kana: c.kana,
      representativeKana: c.rep,
      payerAliases: aliases,
    };
  });
}

function customerIdByName(): Map<string, string> {
  const map = new Map<string, string>();
  uniqueCustomers().forEach((c, i) => map.set(c.name, `CUST-${String(i + 1).padStart(3, "0")}`));
  return map;
}

// ---- 債権（販売管理システムの未消込売掛金一覧） ----

export function buildSeedInvoices(today: string): Invoice[] {
  const idMap = customerIdByName();
  return ROWS.map((r, i) => {
    const due = addDays(today, -r.dueAgo);
    return {
      invoiceNo: `INV-${String(i + 1).padStart(4, "0")}`,
      voucherNo: `SO-${String(i + 1).padStart(4, "0")}`,
      customerId: idMap.get(r.customer)!,
      amount: r.amount,
      issueDate: addDays(due, -30),
      dueDate: due,
      staffName: r.staffMissing ? "" : STAFFS[i % STAFFS.length],
      status: "unsynced",
      warning: r.staffMissing ? "連携データに担当営業が未設定のため「未設定」で補完しました" : null,
      clearedBy: null,
      clearedAtLabel: null,
      paymentIds: [],
    };
  });
}

// 連携フィードに紛れた重複伝票（A-4 整合性チェックのデモ用）
export const FEED_DUPLICATE = {
  voucherNo: "SO-0002",
  invoiceNo: "INV-0002",
  customerName: "株式会社デルタ食品",
  amount: 184800,
  note: "同一伝票番号のため取込をスキップ",
};

// ---- 入金（銀行FBデータ） ----

export function buildSeedPayments(today: string): Payment[] {
  const list: { ago: number; amount: number; raw: string }[] = [];
  for (const r of ROWS) {
    if (r.pay) list.push({ ago: r.pay.ago, amount: r.pay.amount ?? r.amount, raw: r.pay.raw });
  }
  list.push(...EXTRA_PAYMENTS);
  // 入金日の古い順に並べ、明細番号を採番（FBデータらしく）
  list.sort((a, b) => b.ago - a.ago);
  return list.map((p, i) => ({
    id: `PAY-${String(i + 1).padStart(3, "0")}`,
    paymentDate: addDays(today, -p.ago),
    payerNameRaw: p.raw,
    amount: p.amount,
    bankName: BANKS[i % BANKS.length],
    status: "unfetched",
    matchedInvoiceNos: [],
  }));
}

// ------------------------------------------------------------
// FBデータ（全銀フォーマット風の生データプレビュー A-2）
// ------------------------------------------------------------

const BANK_KANA: Record<string, string> = {
  デモ中央銀行: "デモチユウオウ",
  サンプル銀行: "サンプルギンコウ",
  あけぼの信用金庫: "アケボノシンキン",
};

export function buildFbRawLines(payments: Payment[], today: string): string[] {
  const yymmdd = today.slice(2, 10).replace(/-/g, "");
  const mmdd = (iso: string) => iso.slice(5).replace("-", "");
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const pad = (n: number) => String(n).padStart(10, "0");
  return [
    `1,21,${yymmdd},0001,デモチユウオウギンコウ,001,ホンテン,1,2345678,デモハンバイ(カ`,
    ...payments.map(
      (p, i) =>
        `2,${String(i + 1).padStart(3, "0")},${mmdd(p.paymentDate)},${pad(p.amount)},${p.payerNameRaw},${BANK_KANA[p.bankName] ?? p.bankName},フリコミ`,
    ),
    `8,${String(payments.length).padStart(3, "0")},${pad(total)}`,
    `9,END`,
  ];
}

// ------------------------------------------------------------
// 督促メールのテンプレート（E-1）
// ------------------------------------------------------------

export function buildDunningMail(
  inv: Invoice,
  customerName: string,
  demoDate: string,
): { to: string; subject: string; body: string } {
  const overdue = diffDays(inv.dueDate, demoDate);
  const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");
  return {
    to: `${customerName} 経理ご担当者様`,
    subject: `【お支払いのご確認】請求書 ${inv.invoiceNo}（${COMPANY.selfName}）`,
    body: [
      `${customerName}`,
      `経理ご担当者様`,
      ``,
      `いつもお世話になっております。`,
      `${COMPANY.selfName} ${COMPANY.dept}の${COMPANY.staffName}です。`,
      ``,
      `下記のご請求につきまして、お支払期日を過ぎておりますが、`,
      `本日時点でご入金の確認ができておりません。`,
      ``,
      `・請求番号　：${inv.invoiceNo}`,
      `・ご請求金額：${yen(inv.amount)}`,
      `・お支払期日：${formatDate(inv.dueDate)}（${overdue}日超過）`,
      ``,
      `行き違いでお手続き済みの場合は、何卒ご容赦ください。`,
      `お手数ですが、お支払状況をご確認のうえ、ご連絡いただけますと幸いです。`,
      ``,
      `${COMPANY.selfName} ${COMPANY.dept}`,
      `担当：${COMPANY.staffName}`,
    ].join("\n"),
  };
}
