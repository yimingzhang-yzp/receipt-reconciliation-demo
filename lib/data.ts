// ------------------------------------------------------------
// シードデータ
//   債権30件は販売管理システムから連携される「計上済み売掛金の未消込一覧」。
//   入金25件は銀行FBデータ。日付は「今日」を基準に相対生成。
//   入金ケース内訳: 完全一致14 / 手数料差4 / 名義ゆれ2 / 合算1 /
//                   名義ゆれ+手数料1 / 不明1 / 過入金1 / 個人名義1
// ------------------------------------------------------------

import type { Customer, Invoice, PayerAlias, Payment } from "./types";
import { normalizePayerName } from "./matching";
import { addDays, diffDays, formatDate } from "./dates";

// 自社・登場人物
export const COMPANY = {
  selfName: "東都販売株式会社",
  dept: "経理部",
  staffName: "佐藤 美咲",
  staffLabel: "経理担当 佐藤 美咲",
  managerName: "田中 誠",
  managerLabel: "経理課長 田中 誠",
  aiLabel: "AI自動消込",
};

export const SOURCE_SYSTEM = "販売管理システム（商奉行クラウド）";
export const ACCOUNTING_SYSTEM = "経理システム（勘定奉行クラウド）";

const STAFFS = ["山本 大輔", "井上 彩", "中村 亮", "木村 沙織", "斎藤 健"];
const BANKS = ["みずほ銀行", "三井住友銀行", "三菱UFJ銀行"];

type SeedRow = {
  customer: string;
  kana: string; // 正式名の読み
  rep?: string; // 代表者カナ（個人名義検知用）
  amount: number;
  dueAgo: number; // 支払期日 = 今日 − dueAgo 日
  staffMissing?: boolean; // 連携データの欠損補完（整合性チェック）
  pay?: { ago: number; amount?: number; raw: string }; // 対応する入金（無し=未入金）
};

// 債権30件（うち25件は入金あり・5件は期日超過の未入金）
const ROWS: SeedRow[] = [
  // --- 完全一致 ×14（B-1: 名義・金額・日付一致 → 自動消込） ---
  { customer: "キリンビバレッジ株式会社", kana: "キリンビバレッジ", amount: 330000, dueAgo: 8, pay: { ago: 9, raw: "キリンビバレツジ(カ" } },
  { customer: "株式会社ニチレイ", kana: "ニチレイ", amount: 184800, dueAgo: 6, pay: { ago: 7, raw: "カ)ニチレイ" } },
  { customer: "エーザイ株式会社", kana: "エーザイ", amount: 748000, dueAgo: 12, pay: { ago: 13, raw: "エーザイ(カ" } },
  { customer: "株式会社リコー", kana: "リコー", amount: 96800, dueAgo: 5, pay: { ago: 5, raw: "カ)リコー" } },
  { customer: "ブラザー工業株式会社", kana: "ブラザーコウギョウ", amount: 275000, dueAgo: 15, pay: { ago: 16, raw: "ブラザーコウギヨウ(カ" } },
  { customer: "株式会社ノーリツ", kana: "ノーリツ", amount: 143000, dueAgo: 10, pay: { ago: 11, raw: "カ)ノーリツ" } },
  { customer: "ライオン株式会社", kana: "ライオン", amount: 561000, dueAgo: 18, pay: { ago: 19, raw: "ライオン(カ" } },
  { customer: "株式会社クレハ", kana: "クレハ", amount: 418000, dueAgo: 7, pay: { ago: 8, raw: "カ)クレハ" } },
  { customer: "ダイキン工業株式会社", kana: "ダイキンコウギョウ", amount: 203500, dueAgo: 9, staffMissing: true, pay: { ago: 9, raw: "ダイキンコウギヨウ(カ" } },
  { customer: "株式会社サンゲツ", kana: "サンゲツ", amount: 126500, dueAgo: 20, pay: { ago: 21, raw: "カ)サンゲツ" } },
  { customer: "ユニ・チャーム株式会社", kana: "ユニチャーム", amount: 88000, dueAgo: 4, pay: { ago: 4, raw: "ユニチヤーム(カ" } },
  { customer: "株式会社モスフードサービス", kana: "モスフードサービス", amount: 352000, dueAgo: 14, pay: { ago: 15, raw: "カ)モスフードサービス" } },
  { customer: "株式会社ヤクルト本社", kana: "ヤクルトホンシャ", amount: 237600, dueAgo: 11, pay: { ago: 12, raw: "カ)ヤクルトホンシヤ" } },
  { customer: "株式会社ニフコ", kana: "ニフコ", amount: 469700, dueAgo: 16, pay: { ago: 17, raw: "カ)ニフコ" } },

  // --- 手数料差 ×4（B-2: 220円 or 440円少ない → 自動消込・手数料控除） ---
  { customer: "株式会社シマノ", kana: "シマノ", amount: 308000, dueAgo: 6, pay: { ago: 6, amount: 307780, raw: "カ)シマノ" } },
  { customer: "ホシザキ株式会社", kana: "ホシザキ", amount: 165000, dueAgo: 13, pay: { ago: 14, amount: 164780, raw: "ホシザキ(カ" } },
  { customer: "株式会社マキタ", kana: "マキタ", amount: 550000, dueAgo: 9, pay: { ago: 10, amount: 549560, raw: "カ)マキタ" } },
  { customer: "ぺんてる株式会社", kana: "ペンテル", amount: 121000, dueAgo: 17, pay: { ago: 18, amount: 120560, raw: "ペンテル(カ" } },

  // --- 名義ゆれ ×2（B-3: カナ略記・旧社名 → 要目検） ---
  { customer: "伊藤忠商事株式会社", kana: "イトウチュウショウジ", amount: 462000, dueAgo: 10, pay: { ago: 11, raw: "カ)イトウチユウ" } },
  { customer: "パナソニック株式会社", kana: "パナソニック", amount: 286000, dueAgo: 12, pay: { ago: 12, raw: "マツシタデンキサンギヨウ(カ" } },

  // --- 合算入金 ×1（B-4: 2請求を1回の振込で。入金は EXTRA_PAYMENTS 側） ---
  { customer: "株式会社ロッテ", kana: "ロッテ", amount: 93500, dueAgo: 8 },
  { customer: "株式会社ロッテ", kana: "ロッテ", amount: 217800, dueAgo: 8 },

  // --- 名義ゆれ + 手数料差 ×1（複合 → 要目検） ---
  { customer: "京セラ株式会社", kana: "キョウセラ", amount: 198000, dueAgo: 7, pay: { ago: 8, amount: 197780, raw: "キヨウセラオオサカ(カ" } },

  // --- 過入金 ×1（B-5: 請求より多い入金 → 要目検・差額振替は承認へ） ---
  { customer: "株式会社ゼンリン", kana: "ゼンリン", amount: 374000, dueAgo: 9, pay: { ago: 10, amount: 506000, raw: "カ)ゼンリン" } },

  // --- 個人名義 ×1（代表者個人の振込 → 要目検） ---
  { customer: "株式会社オカムラ", kana: "オカムラ", rep: "タナカ ヒロシ", amount: 259600, dueAgo: 5, pay: { ago: 5, raw: "タナカ ヒロシ" } },

  // --- 未入金 ×5（B-6: 期日超過 → 督促対象。エイジング 〜30/31〜60/61〜 に分散） ---
  { customer: "株式会社デサント", kana: "デサント", amount: 770000, dueAgo: 68 },
  { customer: "株式会社タダノ", kana: "タダノ", amount: 253000, dueAgo: 41 },
  { customer: "株式会社パイロットコーポレーション", kana: "パイロットコーポレーション", amount: 94600, dueAgo: 33 },
  { customer: "ローム株式会社", kana: "ローム", amount: 442200, dueAgo: 18 },
  { customer: "株式会社サクラクレパス", kana: "サクラクレパス", amount: 60500, dueAgo: 6 },
];

// 請求に対応しない入金（合算・不明）
const EXTRA_PAYMENTS: { ago: number; amount: number; raw: string }[] = [
  { ago: 9, amount: 311300, raw: "カ)ロツテ" }, // 合算: 93,500 + 217,800
  { ago: 3, amount: 137500, raw: "クボタ(カ" }, // 不明入金（マスタに該当取引先なし）
];

// 正式名義以外の振込名義（旧社名・カナ別名。連携元マスタ由来 = addedBy: "sync"）
const EXTRA_ALIASES: Record<string, Omit<PayerAlias, "addedBy">[]> = {
  パナソニック株式会社: [
    { alias: "マツシタデンキサンギョウ", kind: "old_name", note: "2008年に松下電器産業株式会社から社名変更" },
  ],
  ダイキン工業株式会社: [
    { alias: "オオサカキンゾクコウギョウ", kind: "old_name", note: "1982年に大阪金属工業株式会社から社名変更" },
  ],
  ユニ・チャーム株式会社: [
    { alias: "タイセイカコウ", kind: "old_name", note: "1974年に大成化工株式会社から社名変更" },
  ],
};

// ---- 取引先マスタ（ROWSの初出順に顧客IDを採番。販売管理システムと同期） ----

// 支払条件（締め・サイト。連携元マスタ由来）
const PAYMENT_TERMS = ["月末締め・翌月末払い", "20日締め・翌月末払い", "月末締め・翌々月10日払い"];

// 先方経理窓口の担当者（本システムで更新できる想定のサンプル値）
const CONTACT_SURNAMES = ["高橋", "佐々木", "小林", "加藤", "吉田", "山田", "松本", "井上", "清水", "森田"];

function paymentTermsFor(index: number): string {
  return PAYMENT_TERMS[index % PAYMENT_TERMS.length];
}

function contactFor(index: number): { name: string; phone: string } {
  const n1 = String(5100 + ((index * 137) % 800)).padStart(4, "0");
  const n2 = String(1000 + ((index * 911) % 9000)).padStart(4, "0");
  return { name: CONTACT_SURNAMES[index % CONTACT_SURNAMES.length], phone: `03-${n1}-${n2}` };
}

// 入金に関する申し送りメモ（消込実務でよく使う情報の例）
const CUSTOMER_NOTES: Record<string, string> = {
  株式会社ロッテ: "複数請求をまとめて振り込まれることが多い（合算入金に注意）",
  パナソニック株式会社: "旧社名（松下電器産業）名義での振込実績あり",
  株式会社ゼンリン: "過入金が発生した場合は次回請求との相殺で合意済み",
  株式会社オカムラ: "代表者個人名義で振り込まれることがある",
};

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
    const contact = contactFor(i);
    return {
      customerId: `CUST-${String(i + 1).padStart(3, "0")}`,
      name: c.name,
      kana: c.kana,
      representativeKana: c.rep,
      paymentTerms: paymentTermsFor(i),
      contactName: contact.name,
      contactPhone: contact.phone,
      note: CUSTOMER_NOTES[c.name] ?? null,
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

// 連携フィードに紛れた重複伝票（整合性チェックの検知対象）
export const FEED_DUPLICATE = {
  voucherNo: "SO-0002",
  invoiceNo: "INV-0002",
  customerName: "株式会社ニチレイ",
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
// FBデータ（全銀フォーマットの生データプレビュー）
// ------------------------------------------------------------

const BANK_KANA: Record<string, string> = {
  みずほ銀行: "ミズホ",
  三井住友銀行: "ミツイスミトモ",
  三菱UFJ銀行: "ミツビシUFJ",
};

export function buildFbRawLines(payments: Payment[], today: string): string[] {
  const yymmdd = today.slice(2, 10).replace(/-/g, "");
  const mmdd = (iso: string) => iso.slice(5).replace("-", "");
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const pad = (n: number) => String(n).padStart(10, "0");
  return [
    `1,21,${yymmdd},0001,ミズホギンコウ,001,ホンテン,1,2345678,トウトハンバイ(カ`,
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
  contactName: string | null,
  demoDate: string,
): { to: string; subject: string; body: string } {
  const overdue = diffDays(inv.dueDate, demoDate);
  const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");
  const contactLine = contactName ? `経理部 ${contactName} 様` : "経理ご担当者様";
  return {
    to: `${customerName} ${contactLine}`,
    subject: `【お支払いのご確認】請求書 ${inv.invoiceNo}（${COMPANY.selfName}）`,
    body: [
      `${customerName}`,
      contactLine,
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
