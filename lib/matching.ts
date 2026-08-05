// ------------------------------------------------------------
// 突合エンジン（指示書 §3-B。UIから分離した純粋関数群）
//   B-1 完全一致 / B-2 手数料差 / B-3 あいまい名義・マスタ別名 /
//   B-4 合算入金 / B-5 過入金・不明入金 / B-6 未入金
//   名義照合は取引先マスタ（payerAliases: 1顧客 : N振込名義）に基づく。
// ------------------------------------------------------------

import type {
  Customer,
  Invoice,
  MatchCandidate,
  MatchClassification,
  MatchResult,
  MatchSettings,
  Payment,
} from "./types";
import { businessDaysBetween, diffDays, formatDateShort } from "./dates";

export const DEFAULT_SETTINGS: MatchSettings = {
  approvalThreshold: 100000,
  feeTolerances: [110, 220, 330, 440, 660, 880],
  autoThreshold: 95,
  reviewMin: 60,
};

// ------------------------------------------------------------
// 名義の正規化（A-3）
// ------------------------------------------------------------

const SMALL_TO_LARGE: Record<string, string> = {
  ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ",
  ッ: "ツ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ヮ: "ワ",
};

/**
 * 全銀カナ名義を突合用に正規化する。
 * 半角→全角(NFKC)、法人格表記(カ)・(カ・株式会社等)の除去、
 * 空白・記号の除去、ひらがな→カタカナ、小書きカナ→大書き。
 */
export function normalizePayerName(raw: string): string {
  let s = raw.normalize("NFKC");
  s = s.replace(/[\s・．.、，,。ｰ]/g, "");
  // 法人格の除去（前後）: カ)アルフア / アルフア(カ / 株式会社アルファ など
  s = s.replace(/^(カ|ユ|ド|シヤ|ザ)[)）]/, "");
  s = s.replace(/[(（](カ|ユ|ド|シヤ|ザ)[)）]?$/, "");
  s = s.replace(/^(株式会社|有限会社|合同会社|カブシキガイシヤ|カブシキガイシャ)/, "");
  s = s.replace(/(株式会社|有限会社|合同会社|カブシキガイシヤ|カブシキガイシャ)$/, "");
  // ひらがな→カタカナ
  s = s.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
  // 小書き→大書き（全銀カナに寄せる）
  s = s.replace(/[ァィゥェォッャュョヮ]/g, (c) => SMALL_TO_LARGE[c] ?? c);
  return s;
}

// ------------------------------------------------------------
// 名義類似度（0〜1）: 完全一致 > 前方一致 > 部分一致 > bigram Dice
// ------------------------------------------------------------

export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.startsWith(b) || b.startsWith(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.max(0.75, ratio); // 前方一致は高評価
  }
  if (a.includes(b) || b.includes(a)) return 0.7;
  const bigrams = (s: string) => {
    const r: string[] = [];
    for (let i = 0; i < s.length - 1; i++) r.push(s.slice(i, i + 2));
    return r;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const rest = [...B];
  let hit = 0;
  for (const g of A) {
    const idx = rest.indexOf(g);
    if (idx >= 0) {
      hit++;
      rest.splice(idx, 1);
    }
  }
  return (2 * hit) / (A.length + B.length);
}

// ------------------------------------------------------------
// 個別ヘルパ
// ------------------------------------------------------------

const pct = (v: number) => `${Math.round(v * 100)}%`;
const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

/** 入金日が支払期日の±5営業日以内か（B-1） */
function withinDateWindow(paymentDate: string, dueDate: string): boolean {
  return businessDaysBetween(paymentDate, dueDate) <= 5;
}

function dateReason(p: Payment, inv: Invoice): string {
  const bd = businessDaysBetween(p.paymentDate, inv.dueDate);
  return `入金日 ${formatDateShort(p.paymentDate)} は支払期日 ${formatDateShort(inv.dueDate)} の${bd}営業日${diffDays(inv.dueDate, p.paymentDate) <= 0 ? "前" : "後"}（±5営業日以内）`;
}

const ALIAS_KIND_TEXT: Record<string, string> = {
  old_name: "旧社名",
  kana_alias: "カナ別名",
  personal: "個人名義",
  learned: "学習済み名義",
};

/** 名義照合の内部結果 */
type NameHit = {
  invoice: Invoice;
  customer: Customer;
  kind: "exact" | "learned" | "master_alias" | "fuzzy" | "personal";
  similarity: number;
  aliasHit: MatchCandidate["aliasHit"];
  reason: string;
};

/** 入金名義と債権の照合（取引先マスタの振込名義 → 代表者 → 類似） */
function nameHits(norm: string, raw: string, invoices: Invoice[], customers: Customer[]): NameHit[] {
  const hits: NameHit[] = [];
  const byId = new Map(customers.map((c) => [c.customerId, c]));

  for (const inv of invoices) {
    const customer = byId.get(inv.customerId);
    if (!customer) continue;

    // マスタの振込名義レコードとの一致（1顧客 : N名義）
    const alias = customer.payerAliases.find((a) => a.alias === norm);
    if (alias) {
      const hitInfo = { alias: alias.alias, kind: alias.kind, customerName: customer.name };
      if (alias.kind === "official") {
        hits.push({
          invoice: inv,
          customer,
          kind: "exact",
          similarity: 1,
          aliasHit: hitInfo,
          reason: `振込名義「${raw}」を正規化した「${norm}」が取引先「${customer.name}（${customer.kana}）」の正規名義と一致`,
        });
      } else if (alias.kind === "learned" || alias.addedBy === "user") {
        hits.push({
          invoice: inv,
          customer,
          kind: "learned",
          similarity: 1,
          aliasHit: hitInfo,
          reason: `振込名義「${raw}」は取引先マスタに登録済みの振込名義（${ALIAS_KIND_TEXT[alias.kind] ?? alias.kind}・目検承認で学習）により「${customer.name}」と確定`,
        });
      } else {
        // 連携元マスタ由来の旧社名・カナ別名 → 参考情報として要目検
        hits.push({
          invoice: inv,
          customer,
          kind: "master_alias",
          similarity: 1,
          aliasHit: hitInfo,
          reason: `振込名義「${raw}」は取引先マスタの振込名義（${ALIAS_KIND_TEXT[alias.kind] ?? alias.kind}${alias.note ? `: ${alias.note}` : ""}）により「${customer.name}」と一致`,
        });
      }
      continue;
    }

    // 代表者個人名義
    if (customer.representativeKana) {
      const repSim = nameSimilarity(norm, normalizePayerName(customer.representativeKana));
      if (repSim >= 0.85) {
        hits.push({
          invoice: inv,
          customer,
          kind: "personal",
          similarity: repSim,
          aliasHit: null,
          reason: `振込名義「${raw}」は取引先「${customer.name}」の代表者「${customer.representativeKana}」と一致（代表者個人名義の振込と推定）`,
        });
        continue;
      }
    }

    // あいまい名義（正規名義との類似度）
    const sim = nameSimilarity(norm, normalizePayerName(customer.kana));
    if (sim >= 0.55) {
      hits.push({
        invoice: inv,
        customer,
        kind: "fuzzy",
        similarity: sim,
        aliasHit: null,
        reason: `振込名義「${raw}」（正規化: ${norm}）は取引先「${customer.name}（${customer.kana}）」と部分一致（類似度 ${pct(sim)}）`,
      });
    }
  }
  return hits;
}

/** 手数料相当の差額か（B-2）。請求 − 入金 が正の手数料候補と一致 */
function feeOf(invoiceTotal: number, paymentAmount: number, settings: MatchSettings): number | null {
  const diff = invoiceTotal - paymentAmount;
  return settings.feeTolerances.includes(diff) ? diff : null;
}

// ------------------------------------------------------------
// 1入金に対する候補列挙
// ------------------------------------------------------------

export function findCandidates(
  payment: Payment,
  invoices: Invoice[],
  customers: Customer[],
  settings: MatchSettings,
): MatchCandidate[] {
  const norm = normalizePayerName(payment.payerNameRaw);
  const hits = nameHits(norm, payment.payerNameRaw, invoices, customers);
  const candidates: MatchCandidate[] = [];

  // --- 単体債権との照合 ---
  for (const h of hits) {
    const inv = h.invoice;
    const base: Omit<MatchCandidate, "matchType" | "score" | "reasons"> = {
      invoiceNos: [inv.invoiceNo],
      nameSimilarity: h.similarity,
      amountDiff: payment.amount - inv.amount,
      feeAssumed: false,
      normalizedPayer: norm,
      aliasHit: h.aliasHit,
    };

    // 金額完全一致
    if (payment.amount === inv.amount) {
      if (h.kind === "exact" || h.kind === "learned") {
        const dateOk = withinDateWindow(payment.paymentDate, inv.dueDate);
        candidates.push({
          ...base,
          matchType: h.kind === "learned" ? "learned" : "exact",
          score: dateOk ? 100 : 88,
          reasons: [
            h.reason,
            `請求額 ${yen(inv.amount)} と入金額が完全一致`,
            dateOk ? dateReason(payment, inv) : `入金日が支払期日の±5営業日を外れているため要確認`,
          ],
        });
      } else if (h.kind === "master_alias") {
        candidates.push({
          ...base,
          matchType: "old_name",
          score: 82,
          reasons: [h.reason, `請求額 ${yen(inv.amount)} と入金額が完全一致`, dateReason(payment, inv)],
        });
      } else if (h.kind === "personal") {
        candidates.push({
          ...base,
          matchType: "personal",
          score: 70,
          reasons: [h.reason, `請求額 ${yen(inv.amount)} と入金額が完全一致`, dateReason(payment, inv)],
        });
      } else {
        // fuzzy: スコア60〜85（類似度でスケール）
        const score = Math.min(85, Math.round(50 + h.similarity * 40));
        candidates.push({
          ...base,
          matchType: "name_fuzzy",
          score,
          reasons: [h.reason, `請求額 ${yen(inv.amount)} と入金額が完全一致`, dateReason(payment, inv)],
        });
      }
      continue;
    }

    // 手数料差（B-2）
    const fee = feeOf(inv.amount, payment.amount, settings);
    if (fee !== null) {
      const feeReason = `金額差 ${yen(fee)} は振込手数料相当（許容: ${settings.feeTolerances.map((f) => f).join("/")}円）`;
      if (h.kind === "exact" || h.kind === "learned") {
        candidates.push({
          ...base,
          feeAssumed: true,
          matchType: "fee_tolerance",
          score: 95,
          reasons: [h.reason, feeReason, dateReason(payment, inv), "手数料控除として仕訳し自動消込が可能"],
        });
      } else {
        // 名義ゆれ + 手数料差の複合 → 要目検
        const fuzzyScore = Math.min(85, Math.round(50 + h.similarity * 40));
        candidates.push({
          ...base,
          feeAssumed: true,
          matchType: "combined",
          score: Math.max(60, fuzzyScore - 5),
          reasons: [h.reason, feeReason, dateReason(payment, inv)],
        });
      }
      continue;
    }

    // 過入金（B-5）
    if (payment.amount > inv.amount && (h.kind === "exact" || h.kind === "learned" || h.similarity >= 0.85)) {
      candidates.push({
        ...base,
        matchType: "overpayment",
        score: 62,
        reasons: [
          h.reason,
          `入金額 ${yen(payment.amount)} が請求額 ${yen(inv.amount)} を ${yen(payment.amount - inv.amount)} 上回る過入金`,
          "差額は仮受金への振替（または返金）が必要",
        ],
      });
      continue;
    }

    // 不足（手数料表に該当しない）→ 一部入金の可能性（弱い候補）
    if (payment.amount < inv.amount && (h.kind === "exact" || h.kind === "learned")) {
      candidates.push({
        ...base,
        matchType: "partial",
        score: 58,
        reasons: [
          h.reason,
          `入金額が請求額に対し ${yen(inv.amount - payment.amount)} 不足（手数料相当額に該当せず）。分割入金または値引の可能性`,
        ],
      });
    }
  }

  // --- 合算入金（B-4）: 同一名義の複数債権の合計と一致 ---
  const strongHits = hits.filter((h) => h.similarity >= 0.85 || h.kind !== "fuzzy");
  const byCustomer = new Map<string, NameHit[]>();
  for (const h of strongHits) {
    const arr = byCustomer.get(h.customer.customerId) ?? [];
    arr.push(h);
    byCustomer.set(h.customer.customerId, arr);
  }
  byCustomer.forEach((list) => {
    const invs = list.map((h) => h.invoice);
    if (invs.length < 2) return;
    const combos: Invoice[][] = [];
    for (let i = 0; i < invs.length; i++)
      for (let j = i + 1; j < invs.length; j++) {
        combos.push([invs[i], invs[j]]);
        for (let k = j + 1; k < invs.length; k++) combos.push([invs[i], invs[j], invs[k]]);
      }
    for (const combo of combos) {
      const total = combo.reduce((s, x) => s + x.amount, 0);
      const fee = feeOf(total, payment.amount, settings);
      if (total === payment.amount || fee !== null) {
        const h0 = list[0];
        const exactName = h0.kind === "exact" || h0.kind === "learned";
        candidates.push({
          invoiceNos: combo.map((x) => x.invoiceNo),
          matchType: "aggregate",
          score: exactName ? 85 : 75,
          nameSimilarity: h0.similarity,
          amountDiff: payment.amount - total,
          feeAssumed: fee !== null,
          normalizedPayer: norm,
          aliasHit: h0.aliasHit,
          reasons: [
            h0.reason,
            `同一名義の未消込債権${combo.length}件（${combo.map((x) => `${x.invoiceNo} ${yen(x.amount)}`).join(" + ")}）の合計 ${yen(total)} が入金額と一致${fee !== null ? `（手数料 ${yen(fee)} 控除後）` : ""}`,
            "合算入金と推定されるため、組み合わせの目検確認が必要",
          ],
        });
      }
    }
  });

  return candidates.sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------
// 全体突合の実行
// ------------------------------------------------------------

export type MatchOutcome = {
  results: MatchResult[]; // 対象入金ごとの判定
  dunningInvoiceNos: string[]; // 期日超過・入金なし（B-6）
};

export function classify(score: number | null, settings: MatchSettings): MatchClassification {
  if (score === null) return "unapplied";
  if (score >= settings.autoThreshold) return "auto";
  if (score >= settings.reviewMin) return "review";
  return "unapplied";
}

/**
 * 突合を実行する。
 * - 1パス目: スコア95以上（完全一致・手数料差）を確定し、対象債権を予約
 * - 2パス目: 残りの入金を残りの債権と照合（あいまい・合算・過入金など）
 * - 最後に期日超過・未入金の債権を督促対象として抽出
 */
export function runMatching(
  invoices: Invoice[],
  payments: Payment[],
  customers: Customer[],
  settings: MatchSettings,
  todayIso: string,
): MatchOutcome {
  const reserved = new Set<string>();
  const results = new Map<string, MatchResult>();

  const available = () => invoices.filter((i) => !reserved.has(i.invoiceNo));

  // 1パス目: 自動消込確定分
  for (const p of payments) {
    const cands = findCandidates(p, available(), customers, settings);
    const best = cands[0] ?? null;
    if (best && classify(best.score, settings) === "auto") {
      best.invoiceNos.forEach((no) => reserved.add(no));
      results.set(p.id, {
        paymentId: p.id,
        classification: "auto",
        best,
        alternates: cands.slice(1, 4),
        remandComment: null,
      });
    }
  }

  // 2パス目: 残り（要目検・保留）
  for (const p of payments) {
    if (results.has(p.id)) continue;
    const cands = findCandidates(p, available(), customers, settings);
    const best = cands[0] ?? null;
    const classification = classify(best?.score ?? null, settings);
    if (best && classification !== "unapplied") {
      best.invoiceNos.forEach((no) => reserved.add(no));
    }
    results.set(p.id, {
      paymentId: p.id,
      classification,
      best,
      alternates: cands.slice(1, 4),
      remandComment: null,
    });
  }

  // B-6: 期日超過・入金なし → 督促対象
  const dunningInvoiceNos = invoices
    .filter((i) => !reserved.has(i.invoiceNo) && diffDays(i.dueDate, todayIso) > 0)
    .map((i) => i.invoiceNo);

  return { results: payments.map((p) => results.get(p.id)!), dunningInvoiceNos };
}

// ------------------------------------------------------------
// エイジング分類（B-6 / G-2）
// ------------------------------------------------------------

export type AgingBucket = "b30" | "b60" | "b61plus";

export function agingBucket(overdueDays: number): AgingBucket {
  if (overdueDays <= 30) return "b30";
  if (overdueDays <= 60) return "b60";
  return "b61plus";
}
