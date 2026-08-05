"use client";

import { create } from "zustand";
import {
  buildDunningMail,
  buildSeedDict,
  buildSeedInvoices,
  buildSeedPayments,
  COMPANY,
} from "./data";
import { DEFAULT_SETTINGS, normalizePayerName, runMatching } from "./matching";
import { addDays, diffDays, nowLabel, todayIso } from "./dates";
import { yen } from "./format";
import type {
  ApprovalRequest,
  AuditActor,
  AuditEvent,
  ClearingRecord,
  DictKind,
  DunningCase,
  DunningStatus,
  Invoice,
  JournalEntry,
  MatchCandidate,
  MatchResult,
  MatchSettings,
  NameDictEntry,
  Payment,
  Role,
  Toast,
} from "./types";

// ------------------------------------------------------------
// デモ用ストア（すべてクライアント側モック。銀行API・メール送信・
// 会計連携は実接続しない §0）。リロード / デモリセットで初期状態に戻る。
// ------------------------------------------------------------

type Seq = { clearing: number; journal: number; approval: number; audit: number; dict: number; toast: number };

type State = {
  demoDate: string; // デモ内日付（督促トレースの経過日数演出用）
  role: Role;
  invoices: Invoice[];
  payments: Payment[];
  results: Record<string, MatchResult>; // paymentId → 突合結果
  dunning: DunningCase[];
  approvals: ApprovalRequest[];
  clearings: ClearingRecord[];
  journals: JournalEntry[];
  audit: AuditEvent[];
  dict: NameDictEntry[];
  settings: MatchSettings;
  invoicesImported: boolean;
  fbFetched: boolean;
  matchingDone: boolean;
  lastRun: { auto: number; review: number; unapplied: number; dunning: number; atLabel: string } | null;
  seq: Seq;
  toasts: Toast[];
};

type ImportSummary = { registered: number; duplicates: number; warnings: number };
type FbSummary = { count: number; total: number };
type RunSummary = { auto: number; review: number; unapplied: number; dunning: number };

type Actions = {
  // 共通
  log: (actor: AuditActor, action: string, message: string, refId?: string) => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  setRole: (role: Role) => void;
  resetDemo: () => void;

  // A. データ取込
  importInvoices: () => ImportSummary;
  fetchFb: () => FbSummary;

  // B. 突合
  executeMatching: () => RunSummary;

  // C. 消込実行（内部でも使用）
  executeClearing: (
    paymentId: string,
    cand: MatchCandidate,
    method: "auto" | "manual" | "approval",
    executedBy: string,
    transferAmount?: number,
  ) => void;

  // D. 目検キュー
  approveReview: (paymentId: string, registerDict: boolean) => void;
  chooseAlternate: (paymentId: string, altIndex: number) => void;
  remandReview: (paymentId: string) => void;
  resolveOverpay: (paymentId: string) => void;
  resolveSuspense: (paymentId: string) => void;

  // E. 督促
  generateDunningMail: (invoiceNo: string) => void;
  updateDunningDraft: (invoiceNo: string, patch: Partial<{ to: string; subject: string; body: string }>) => void;
  sendDunningMail: (invoiceNo: string) => void;
  setDunningTrace: (invoiceNo: string, status: DunningStatus) => void;
  sendReminder: (invoiceNo: string) => void;
  advanceDemoDays: (n: number) => void;

  // F. 承認
  decideApproval: (id: string, decision: "approved" | "rejected" | "remanded", comment: string) => void;

  // G. 設定
  setApprovalThreshold: (v: number) => void;
  toggleFeeTolerance: (v: number) => void;
  addDictEntry: (from: string, to: string, kind: DictKind, note?: string) => void;
  removeDictEntry: (id: string) => void;
};

function buildInitialState(): Omit<State, "toasts"> {
  const today = todayIso();
  return {
    demoDate: today,
    role: "staff",
    invoices: buildSeedInvoices(today),
    payments: buildSeedPayments(today),
    results: {},
    dunning: [],
    approvals: [],
    clearings: [],
    journals: [],
    audit: [
      {
        id: 1,
        atLabel: nowLabel(),
        demoDate: today,
        actor: "system",
        action: "init",
        message: "デモ環境を初期化しました（請求書フォルダ31ファイル・FBデータ待機中）",
        refId: null,
      },
    ],
    dict: buildSeedDict(),
    settings: { ...DEFAULT_SETTINGS, feeTolerances: [...DEFAULT_SETTINGS.feeTolerances] },
    invoicesImported: false,
    fbFetched: false,
    matchingDone: false,
    lastRun: null,
    seq: { clearing: 1, journal: 1, approval: 1, audit: 2, dict: 4, toast: 1 },
  };
}

const upInvoices = (list: Invoice[], nos: string[], patch: Partial<Invoice>): Invoice[] =>
  list.map((i) => (nos.includes(i.invoiceNo) ? { ...i, ...patch } : i));

const upPayment = (list: Payment[], id: string, patch: Partial<Payment>): Payment[] =>
  list.map((p) => (p.id === id ? { ...p, ...patch } : p));

export const useDemoStore = create<State & Actions>((set, get) => ({
  ...buildInitialState(),
  toasts: [],

  // ------------------------------------------------------------
  // 共通
  // ------------------------------------------------------------

  log: (actor, action, message, refId) =>
    set((s) => ({
      audit: [
        ...s.audit,
        { id: s.seq.audit, atLabel: nowLabel(), demoDate: s.demoDate, actor, action, message, refId: refId ?? null },
      ],
      seq: { ...s.seq, audit: s.seq.audit + 1 },
    })),

  pushToast: (message, tone = "info") =>
    set((s) => ({
      toasts: [...s.toasts, { id: s.seq.toast, message, tone }],
      seq: { ...s.seq, toast: s.seq.toast + 1 },
    })),

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setRole: (role) => {
    set({ role });
    get().log("system", "role_switch", role === "manager" ? `ロールを「${COMPANY.managerLabel}」に切り替えました` : `ロールを「${COMPANY.staffLabel}」に切り替えました`);
  },

  resetDemo: () => {
    set({ ...buildInitialState(), toasts: [] });
  },

  // ------------------------------------------------------------
  // A. データ取込
  // ------------------------------------------------------------

  importInvoices: () => {
    const s = get();
    const targets = s.invoices.filter((i) => i.status === "folder");
    const warnings = targets.filter((i) => i.warning).length;
    set((st) => ({
      invoices: st.invoices.map((i) => (i.status === "folder" ? { ...i, status: "open" } : i)),
      invoicesImported: true,
    }));
    get().log(
      "ai",
      "import_invoices",
      `請求書フォルダから${targets.length}件を抽出し、債権台帳へ登録しました（重複1件スキップ・欠損補完${warnings}件）`,
    );
    return { registered: targets.length, duplicates: 1, warnings };
  },

  fetchFb: () => {
    const s = get();
    const targets = s.payments.filter((p) => p.status === "unfetched");
    const total = targets.reduce((sum, p) => sum + p.amount, 0);
    set((st) => ({
      payments: st.payments.map((p) => (p.status === "unfetched" ? { ...p, status: "unmatched" } : p)),
      fbFetched: true,
    }));
    get().log("ai", "fetch_fb", `銀行からFBデータ（全銀フォーマット）を取得し、入金明細${targets.length}件（${yen(total)}）をパース・名義正規化しました`);
    return { count: targets.length, total };
  },

  // ------------------------------------------------------------
  // B. 突合の実行
  // ------------------------------------------------------------

  executeMatching: () => {
    const s = get();
    const eligiblePays = s.payments.filter((p) => ["unmatched", "in_review", "unapplied"].includes(p.status));
    const eligibleInvs = s.invoices.filter((i) => ["open", "in_review"].includes(i.status));
    const outcome = runMatching(eligibleInvs, eligiblePays, s.dict, s.settings, s.demoDate);

    let auto = 0;
    let review = 0;
    let unapplied = 0;

    // 結果を保存
    const newResults: Record<string, MatchResult> = { ...s.results };
    for (const r of outcome.results) {
      newResults[r.paymentId] = r;
      if (r.classification === "auto") auto++;
      else if (r.classification === "review") review++;
      else unapplied++;
    }
    set({ results: newResults });

    // 自動消込（C-1: 実行者・日時・根拠・スコアをログに記録）
    for (const r of outcome.results) {
      if (r.classification === "auto" && r.best) {
        get().executeClearing(r.paymentId, r.best, "auto", COMPANY.aiLabel);
      }
    }

    // 要目検・保留のステータス反映
    set((st) => {
      const reviewInvoiceNos = new Set(
        outcome.results.filter((r) => r.classification === "review").flatMap((r) => r.best?.invoiceNos ?? []),
      );
      return {
        payments: st.payments.map((p) => {
          const r = newResults[p.id];
          if (!r || !eligiblePays.some((e) => e.id === p.id)) return p;
          if (r.classification === "review") return { ...p, status: "in_review" };
          if (r.classification === "unapplied") return { ...p, status: "unapplied" };
          return p; // auto は executeClearing 済み
        }),
        invoices: st.invoices.map((i) =>
          reviewInvoiceNos.has(i.invoiceNo) && (i.status === "open" || i.status === "in_review")
            ? { ...i, status: "in_review" }
            : i,
        ),
      };
    });

    // B-6: 督促対象の更新（消込済みになった案件のケースは除去、新規は追加）
    set((st) => {
      const openNos = new Set(outcome.dunningInvoiceNos);
      const kept = st.dunning.filter((d) => {
        const inv = st.invoices.find((i) => i.invoiceNo === d.invoiceNo);
        return inv && (inv.status === "open" || openNos.has(d.invoiceNo));
      });
      const known = new Set(kept.map((d) => d.invoiceNo));
      const added: DunningCase[] = outcome.dunningInvoiceNos
        .filter((no) => !known.has(no))
        .map((no) => ({ invoiceNo: no, status: "target", draft: null, sentOnDemoDate: null, remindCount: 0 }));
      return { dunning: [...kept, ...added] };
    });

    const dunning = get().dunning.length;
    set({ matchingDone: true, lastRun: { auto, review, unapplied, dunning, atLabel: nowLabel() } });
    get().log(
      "ai",
      "run_matching",
      `自動突合を実行しました → 自動消込 ${auto}件 / 要目検 ${review}件 / 保留 ${unapplied}件 / 督促対象 ${dunning}件`,
    );
    return { auto, review, unapplied, dunning };
  },

  // ------------------------------------------------------------
  // C. 消込の実行（自動・目検・承認 共通）
  // ------------------------------------------------------------

  executeClearing: (paymentId, cand, method, executedBy, transferAmount = 0) => {
    const s = get();
    const pay = s.payments.find((p) => p.id === paymentId);
    if (!pay) return;
    const invs = s.invoices.filter((i) => cand.invoiceNos.includes(i.invoiceNo));
    const clearedAmount = invs.reduce((sum, i) => sum + i.amount, 0);
    const feeAmount = cand.feeAssumed ? Math.max(0, clearedAmount - pay.amount) : 0;

    const clearingId = `CLR-${String(s.seq.clearing).padStart(3, "0")}`;
    const journalId = `JRN-${String(s.seq.journal).padStart(3, "0")}`;

    const clearing: ClearingRecord = {
      id: clearingId,
      executedAtLabel: `${s.demoDate} ${nowLabel()}`,
      executedBy,
      method,
      invoiceNos: cand.invoiceNos,
      paymentId,
      clearedAmount,
      feeAmount,
      transferAmount,
      score: cand.score,
      basis: cand.reasons.join(" ／ "),
    };

    // C-2: 仕訳生成（借方: 普通預金 + 支払手数料 ／ 貸方: 売掛金 + 仮受金）
    const debits = [{ account: "普通預金", amount: pay.amount }];
    if (feeAmount > 0) debits.push({ account: "支払手数料", amount: feeAmount });
    const credits = [{ account: "売掛金", amount: clearedAmount }];
    if (transferAmount > 0) credits.push({ account: "仮受金", amount: transferAmount });

    const journal: JournalEntry = {
      id: journalId,
      date: s.demoDate,
      debits,
      credits,
      memo: `${invs.map((i) => i.invoiceNo).join("・")} ${invs[0]?.customerName ?? ""}${feeAmount > 0 ? `（振込手数料 ${yen(feeAmount)} 控除）` : ""}${transferAmount > 0 ? `（差額 ${yen(transferAmount)} を仮受金へ振替）` : ""}`,
      clearingId,
    };

    set((st) => ({
      invoices: upInvoices(st.invoices, cand.invoiceNos, {
        status: method === "auto" ? "cleared_auto" : "cleared_manual",
        clearedBy: executedBy,
        clearedAtLabel: clearing.executedAtLabel,
        paymentIds: [paymentId],
      }),
      payments: upPayment(st.payments, paymentId, {
        status: method === "auto" ? "matched_auto" : "matched_manual",
        matchedInvoiceNos: cand.invoiceNos,
      }),
      clearings: [...st.clearings, clearing],
      journals: [...st.journals, journal],
      dunning: st.dunning.filter((d) => !cand.invoiceNos.includes(d.invoiceNo)),
      seq: { ...st.seq, clearing: st.seq.clearing + 1, journal: st.seq.journal + 1 },
    }));

    get().log(
      method === "auto" ? "ai" : method === "approval" ? "manager" : "staff",
      "clearing",
      `${cand.invoiceNos.join("・")}（${invs[0]?.customerName ?? ""}）を消込 — 実行者: ${executedBy} / スコア${cand.score} / ${clearing.basis.slice(0, 60)}…`,
      paymentId,
    );
  },

  // ------------------------------------------------------------
  // D. 目検キュー（Human-in-the-loop）
  // ------------------------------------------------------------

  approveReview: (paymentId, registerDict) => {
    const s = get();
    const r = s.results[paymentId];
    const pay = s.payments.find((p) => p.id === paymentId);
    if (!r?.best || !pay || pay.status !== "in_review") return;
    const cand = r.best;
    if (cand.matchType === "overpayment") return; // 過入金は専用フロー

    get().executeClearing(paymentId, cand, "manual", COMPANY.staffLabel);
    get().log("staff", "review_approve", `目検で承認し消込を確定（${cand.invoiceNos.join("・")} / スコア${cand.score}）`, paymentId);

    // D-3: 名義ゆれの辞書学習
    if (registerDict && ["name_fuzzy", "old_name", "personal", "combined"].includes(cand.matchType)) {
      const inv = s.invoices.find((i) => i.invoiceNo === cand.invoiceNos[0]);
      if (inv) {
        const kind: DictKind = cand.matchType === "personal" ? "personal" : "learned";
        get().addDictEntry(pay.payerNameRaw, inv.customerName, kind, "目検承認時に自動登録");
        get().pushToast(
          `名義「${pay.payerNameRaw}」を辞書に登録しました。次回の突合から自動一致します`,
          "success",
        );
      }
    }
    get().pushToast(`${cand.invoiceNos.join("・")} を消込しました`, "success");
  },

  chooseAlternate: (paymentId, altIndex) => {
    const s = get();
    const r = s.results[paymentId];
    if (!r || !r.alternates[altIndex]) return;
    const prev = r.best;
    const next = r.alternates[altIndex];
    const alternates = [...r.alternates];
    alternates.splice(altIndex, 1);
    if (prev) alternates.unshift(prev);

    set((st) => ({
      results: { ...st.results, [paymentId]: { ...r, best: next, alternates } },
      invoices: st.invoices.map((i) => {
        if (prev?.invoiceNos.includes(i.invoiceNo) && i.status === "in_review") return { ...i, status: "open" };
        if (next.invoiceNos.includes(i.invoiceNo) && i.status === "open") return { ...i, status: "in_review" };
        return i;
      }),
    }));
    get().log("staff", "choose_alternate", `別候補（${next.invoiceNos.join("・")} / スコア${next.score}）に切り替えました`, paymentId);
  },

  remandReview: (paymentId) => {
    const s = get();
    const r = s.results[paymentId];
    const pay = s.payments.find((p) => p.id === paymentId);
    if (!r || !pay) return;
    set((st) => ({
      payments: upPayment(st.payments, paymentId, { status: "unapplied" }),
      results: { ...st.results, [paymentId]: { ...r, classification: "unapplied" } },
      invoices: st.invoices.map((i) =>
        r.best?.invoiceNos.includes(i.invoiceNo) && i.status === "in_review" ? { ...i, status: "open" } : i,
      ),
    }));
    // 差戻しで台帳に戻った請求が期日超過なら督促対象へ
    const overdue = (r.best?.invoiceNos ?? [])
      .map((no) => get().invoices.find((i) => i.invoiceNo === no))
      .filter((i): i is Invoice => !!i && i.status === "open" && diffDays(i.dueDate, get().demoDate) > 0);
    if (overdue.length > 0) {
      set((st) => {
        const known = new Set(st.dunning.map((d) => d.invoiceNo));
        return {
          dunning: [
            ...st.dunning,
            ...overdue
              .filter((i) => !known.has(i.invoiceNo))
              .map((i) => ({ invoiceNo: i.invoiceNo, status: "target" as const, draft: null, sentOnDemoDate: null, remindCount: 0 })),
          ],
        };
      });
    }
    get().log("staff", "review_remand", `候補を差戻し、入金を保留に戻しました`, paymentId);
    get().pushToast("候補を差戻しました（入金は保留へ）", "info");
  },

  resolveOverpay: (paymentId) => {
    const s = get();
    const r = s.results[paymentId];
    const pay = s.payments.find((p) => p.id === paymentId);
    if (!r?.best || !pay || r.best.matchType !== "overpayment") return;
    const inv = s.invoices.find((i) => i.invoiceNo === r.best!.invoiceNos[0]);
    if (!inv) return;
    const diff = pay.amount - inv.amount;

    if (diff >= s.settings.approvalThreshold) {
      // F-1: 閾値以上は上長承認へ回付
      const id = `APR-${String(s.seq.approval).padStart(3, "0")}`;
      const req: ApprovalRequest = {
        id,
        type: "overpay_transfer",
        title: `過入金の振替消込（${inv.customerName}）`,
        detail: `請求 ${inv.invoiceNo}（${yen(inv.amount)}）に対し入金 ${yen(pay.amount)}。請求額分を消込み、差額 ${yen(diff)} を仮受金へ振替する`,
        amount: diff,
        paymentId,
        invoiceNos: [inv.invoiceNo],
        requestedBy: COMPANY.staffLabel,
        requestedOnDemoDate: s.demoDate,
        status: "waiting",
        decisionComment: null,
        decidedOnDemoDate: null,
      };
      set((st) => ({
        approvals: [...st.approvals, req],
        payments: upPayment(st.payments, paymentId, { status: "pending_approval" }),
        invoices: upInvoices(st.invoices, [inv.invoiceNo], { status: "pending_approval" }),
        seq: { ...st.seq, approval: st.seq.approval + 1 },
      }));
      get().log(
        "staff",
        "approval_request",
        `振替額 ${yen(diff)} が承認閾値（${yen(s.settings.approvalThreshold)}）以上のため、${COMPANY.managerLabel}へ承認依頼を回付しました`,
        id,
      );
      get().pushToast(`処理金額 ${yen(diff)} は閾値以上のため上長承認へ回付しました`, "warn");
    } else {
      get().executeClearing(paymentId, r.best, "manual", COMPANY.staffLabel, diff);
      get().pushToast(`消込を実行し、差額 ${yen(diff)} を仮受金へ振替しました`, "success");
    }
  },

  resolveSuspense: (paymentId) => {
    const s = get();
    const pay = s.payments.find((p) => p.id === paymentId);
    if (!pay || pay.status !== "unapplied") return;

    if (pay.amount >= s.settings.approvalThreshold) {
      const id = `APR-${String(s.seq.approval).padStart(3, "0")}`;
      const req: ApprovalRequest = {
        id,
        type: "suspense_receipt",
        title: `不明入金の仮受金計上（${pay.payerNameRaw}）`,
        detail: `${pay.paymentDate} 入金 ${yen(pay.amount)}（名義: ${pay.payerNameRaw}）。該当請求が特定できないため、仮受金として計上する`,
        amount: pay.amount,
        paymentId,
        invoiceNos: [],
        requestedBy: COMPANY.staffLabel,
        requestedOnDemoDate: s.demoDate,
        status: "waiting",
        decisionComment: null,
        decidedOnDemoDate: null,
      };
      set((st) => ({
        approvals: [...st.approvals, req],
        payments: upPayment(st.payments, paymentId, { status: "pending_approval" }),
        seq: { ...st.seq, approval: st.seq.approval + 1 },
      }));
      get().log(
        "staff",
        "approval_request",
        `不明入金 ${yen(pay.amount)} の仮受金計上は承認閾値以上のため、${COMPANY.managerLabel}へ承認依頼を回付しました`,
        id,
      );
      get().pushToast(`処理金額 ${yen(pay.amount)} は閾値以上のため上長承認へ回付しました`, "warn");
    } else {
      const journalId = `JRN-${String(s.seq.journal).padStart(3, "0")}`;
      set((st) => ({
        payments: upPayment(st.payments, paymentId, { status: "transferred" }),
        journals: [
          ...st.journals,
          {
            id: journalId,
            date: st.demoDate,
            debits: [{ account: "普通預金", amount: pay.amount }],
            credits: [{ account: "仮受金", amount: pay.amount }],
            memo: `不明入金の仮受金計上（名義: ${pay.payerNameRaw}）`,
            clearingId: null,
          },
        ],
        seq: { ...st.seq, journal: st.seq.journal + 1 },
      }));
      get().log("staff", "suspense_receipt", `不明入金 ${yen(pay.amount)} を仮受金として計上しました`, paymentId);
      get().pushToast("仮受金として計上しました", "success");
    }
  },

  // ------------------------------------------------------------
  // E. 督促
  // ------------------------------------------------------------

  generateDunningMail: (invoiceNo) => {
    const s = get();
    const inv = s.invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!inv) return;
    const draft = buildDunningMail(inv, s.demoDate);
    set((st) => ({
      dunning: st.dunning.map((d) => (d.invoiceNo === invoiceNo ? { ...d, status: "drafted", draft } : d)),
    }));
    get().log("ai", "dunning_draft", `${inv.customerName}（${invoiceNo}）宛の督促メール文面を自動生成しました`, invoiceNo);
  },

  updateDunningDraft: (invoiceNo, patch) =>
    set((st) => ({
      dunning: st.dunning.map((d) =>
        d.invoiceNo === invoiceNo && d.draft ? { ...d, draft: { ...d.draft, ...patch } } : d,
      ),
    })),

  sendDunningMail: (invoiceNo) => {
    const s = get();
    set((st) => ({
      dunning: st.dunning.map((d) =>
        d.invoiceNo === invoiceNo ? { ...d, status: "sent", sentOnDemoDate: st.demoDate } : d,
      ),
    }));
    get().log("staff", "dunning_send", `督促メールを送信しました（モック送信・実配信なし）`, invoiceNo);
    get().pushToast("督促メールを送信しました（モック）", "success");
  },

  setDunningTrace: (invoiceNo, status) => {
    set((st) => ({
      dunning: st.dunning.map((d) => (d.invoiceNo === invoiceNo ? { ...d, status } : d)),
    }));
    const label: Record<DunningStatus, string> = {
      target: "未送信",
      drafted: "文面作成済み",
      sent: "送信済み",
      opened: "開封",
      replied: "返信あり",
      no_reaction: "無反応",
    };
    get().log("system", "dunning_trace", `督促ステータスを「${label[status]}」に更新しました（デモ用トグル）`, invoiceNo);
  },

  sendReminder: (invoiceNo) => {
    set((st) => ({
      dunning: st.dunning.map((d) =>
        d.invoiceNo === invoiceNo
          ? { ...d, status: "sent", sentOnDemoDate: st.demoDate, remindCount: d.remindCount + 1 }
          : d,
      ),
    }));
    get().log("staff", "dunning_remind", `再督促メールを送信しました（モック）`, invoiceNo);
    get().pushToast("再督促メールを送信しました（モック）", "success");
  },

  advanceDemoDays: (n) => {
    set((st) => ({ demoDate: addDays(st.demoDate, n) }));
  },

  // ------------------------------------------------------------
  // F. 上長承認
  // ------------------------------------------------------------

  decideApproval: (id, decision, comment) => {
    const s = get();
    const req = s.approvals.find((a) => a.id === id);
    if (!req || req.status !== "waiting") return;

    set((st) => ({
      approvals: st.approvals.map((a) =>
        a.id === id ? { ...a, status: decision, decisionComment: comment || null, decidedOnDemoDate: st.demoDate } : a,
      ),
    }));

    if (decision === "approved") {
      if (req.type === "overpay_transfer" && req.paymentId) {
        const r = get().results[req.paymentId];
        if (r?.best) {
          // 承認済みなので請求ステータスを一旦戻してから消込実行
          set((st) => ({ invoices: upInvoices(st.invoices, req.invoiceNos, { status: "in_review" }) }));
          get().executeClearing(req.paymentId, r.best, "approval", `${COMPANY.managerLabel}（承認）`, req.amount);
        }
      } else if (req.type === "suspense_receipt" && req.paymentId) {
        const pay = get().payments.find((p) => p.id === req.paymentId)!;
        const journalId = `JRN-${String(get().seq.journal).padStart(3, "0")}`;
        set((st) => ({
          payments: upPayment(st.payments, req.paymentId!, { status: "transferred" }),
          journals: [
            ...st.journals,
            {
              id: journalId,
              date: st.demoDate,
              debits: [{ account: "普通預金", amount: pay.amount }],
              credits: [{ account: "仮受金", amount: pay.amount }],
              memo: `不明入金の仮受金計上（名義: ${pay.payerNameRaw}）※上長承認済み`,
              clearingId: null,
            },
          ],
          seq: { ...st.seq, journal: st.seq.journal + 1 },
        }));
      }
      get().log("manager", "approve", `承認依頼 ${id}（${req.title} / ${yen(req.amount)}）を承認しました${comment ? `（コメント: ${comment}）` : ""}`, id);
      get().pushToast("承認しました。処理を実行します", "success");
    } else {
      // 却下・差戻し → 担当者の目検キューに戻す
      if (req.paymentId) {
        const backTo = req.type === "suspense_receipt" ? "unapplied" : "in_review";
        set((st) => ({
          payments: upPayment(st.payments, req.paymentId!, { status: backTo }),
          invoices: upInvoices(st.invoices, req.invoiceNos, { status: "in_review" }),
          results: st.results[req.paymentId!]
            ? {
                ...st.results,
                [req.paymentId!]: { ...st.results[req.paymentId!], remandComment: comment || "（コメントなし）" },
              }
            : st.results,
        }));
      }
      const verb = decision === "rejected" ? "却下" : "差戻し";
      get().log("manager", decision === "rejected" ? "reject" : "remand", `承認依頼 ${id}（${req.title}）を${verb}しました${comment ? `（コメント: ${comment}）` : ""}`, id);
      get().pushToast(`${verb}しました。担当者の目検キューへ戻します`, "warn");
    }
  },

  // ------------------------------------------------------------
  // G. 設定
  // ------------------------------------------------------------

  setApprovalThreshold: (v) => {
    set((st) => ({ settings: { ...st.settings, approvalThreshold: v } }));
    get().log("staff", "setting_change", `上長承認の金額閾値を ${yen(v)} に変更しました`);
    get().pushToast(`承認閾値を ${yen(v)} に変更しました`, "info");
  },

  toggleFeeTolerance: (v) => {
    set((st) => {
      const has = st.settings.feeTolerances.includes(v);
      const next = has ? st.settings.feeTolerances.filter((x) => x !== v) : [...st.settings.feeTolerances, v].sort((a, b) => a - b);
      return { settings: { ...st.settings, feeTolerances: next } };
    });
    get().log("staff", "setting_change", `手数料許容値（${v}円）を${get().settings.feeTolerances.includes(v) ? "有効化" : "無効化"}しました`);
  },

  addDictEntry: (from, to, kind, note) => {
    const s = get();
    const normalized = normalizePayerName(from);
    if (s.dict.some((e) => e.from === normalized && e.to === to)) return;
    const entry: NameDictEntry = {
      id: `DICT-${String(s.seq.dict).padStart(3, "0")}`,
      from: normalized,
      to,
      kind,
      addedBy: "user",
      note: note ?? null,
    };
    set((st) => ({ dict: [...st.dict, entry], seq: { ...st.seq, dict: st.seq.dict + 1 } }));
    get().log("staff", "dict_register", `名義ゆれ辞書に登録: 「${normalized}」→「${to}」（${kind === "personal" ? "個人名義" : "学習済み"}）`, entry.id);
  },

  removeDictEntry: (id) => {
    const entry = get().dict.find((e) => e.id === id);
    set((st) => ({ dict: st.dict.filter((e) => e.id !== id) }));
    if (entry) get().log("staff", "dict_remove", `名義ゆれ辞書から削除: 「${entry.from}」→「${entry.to}」`, id);
  },
}));
