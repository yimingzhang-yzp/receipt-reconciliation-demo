"use client";

import { useMemo, useRef, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { buildFbRawLines, FEED_DUPLICATE, SOURCE_SYSTEM } from "@/lib/data";
import { normalizePayerName } from "@/lib/matching";
import { customerNameOf, customerOf, formatDate, formatDateShort, yen } from "@/lib/format";
import { Button, Card, HeroBanner, LinkButton, SectionTitle, Spinner, Td, Th } from "@/components/ui";
import { InvoiceStatusBadge, WarnBadge, AliasKindBadge, AgentAvatar } from "@/components/badges";
import { Icon } from "@/components/icons";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 販売管理システムから流れてくる債権レコード（未消込売掛金の一覧 + 整合性チェック用の重複伝票）
type FeedRecord = {
  voucherNo: string;
  invoiceNo: string;
  customerName: string;
  amount: number;
  dueDate: string;
  warn: "duplicate" | "missing_staff" | null;
};

export default function ImportPage() {
  const customers = useDemoStore((s) => s.customers);
  const invoices = useDemoStore((s) => s.invoices);
  const payments = useDemoStore((s) => s.payments);
  const invoicesImported = useDemoStore((s) => s.invoicesImported);
  const fbFetched = useDemoStore((s) => s.fbFetched);
  const matchingDone = useDemoStore((s) => s.matchingDone);
  const importInvoices = useDemoStore((s) => s.importInvoices);
  const fetchFb = useDemoStore((s) => s.fetchFb);
  const demoDate = useDemoStore((s) => s.demoDate);

  // ---- 債権データ連携（A-1: 販売管理システムから未消込債権を同期）----
  const [syncRunning, setSyncRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(invoicesImported ? 999 : 0);
  const [importSummary, setImportSummary] = useState<{ registered: number; duplicates: number; warnings: number } | null>(
    invoicesImported ? { registered: 30, duplicates: 1, warnings: 1 } : null,
  );
  const feedRef = useRef<HTMLDivElement>(null);

  const feed = useMemo<FeedRecord[]>(() => {
    const records: FeedRecord[] = invoices.map((i) => ({
      voucherNo: i.voucherNo,
      invoiceNo: i.invoiceNo,
      customerName: customerNameOf(customers, i.customerId),
      amount: i.amount,
      dueDate: i.dueDate,
      warn: i.warning ? "missing_staff" : null,
    }));
    // 連携フィードに重複伝票を混ぜる（A-4 整合性チェックのデモ）
    const dup = invoices.find((i) => i.invoiceNo === FEED_DUPLICATE.invoiceNo);
    records.splice(2, 0, {
      voucherNo: FEED_DUPLICATE.voucherNo,
      invoiceNo: FEED_DUPLICATE.invoiceNo,
      customerName: FEED_DUPLICATE.customerName,
      amount: FEED_DUPLICATE.amount,
      dueDate: dup?.dueDate ?? demoDate,
      warn: "duplicate",
    });
    return records;
  }, [invoices, customers, demoDate]);

  async function runSync() {
    if (syncRunning || invoicesImported) return;
    setSyncRunning(true);
    for (let i = 0; i < feed.length; i++) {
      setProcessedCount(i + 1);
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
      await sleep(75);
    }
    await sleep(250);
    const summary = importInvoices();
    setImportSummary(summary);
    setSyncRunning(false);
  }

  // ---- FBデータ取得（A-2）----
  const [fbRunning, setFbRunning] = useState(false);
  const [rawShown, setRawShown] = useState(fbFetched ? 999 : 0);
  const [fbParsed, setFbParsed] = useState(fbFetched);
  const rawRef = useRef<HTMLDivElement>(null);

  const rawLines = useMemo(() => buildFbRawLines(payments, demoDate), [payments, demoDate]);

  async function runFbFetch() {
    if (fbRunning || fbFetched) return;
    setFbRunning(true);
    for (let i = 0; i < rawLines.length; i++) {
      setRawShown(i + 1);
      rawRef.current?.scrollTo({ top: rawRef.current.scrollHeight });
      await sleep(55);
    }
    await sleep(400);
    fetchFb();
    setFbParsed(true);
    setFbRunning(false);
  }

  const fbTotal = payments.reduce((s, p) => s + p.amount, 0);
  const bothReady = invoicesImported && fbFetched;
  const shownFeed = invoicesImported ? feed : feed.slice(0, processedCount);

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="DATA INTAKE"
        title="データ取込"
        description={`${SOURCE_SYSTEM}からの未消込債権の同期と、銀行FBデータ（全銀フォーマット）の取得・正規化を行います。売掛金は請求時点で計上済みのため、ここでは「計上済み売掛金（未消込分）」を同期します。`}
      />

      {bothReady && !matchingDone && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center">
          <AgentAvatar size="h-9 w-9" />
          <p className="flex-1 text-sm text-ink-soft">
            債権台帳（{invoices.filter((i) => i.status !== "unsynced").length}件）と入金明細（{payments.length}件）が揃いました。自動突合を実行できます。
          </p>
          <LinkButton href="/matching" variant="ai" size="md">
            <Icon name="sparkles" className="h-4 w-4" /> 自動突合を実行
          </LinkButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ---- 販売管理システム連携（債権データ取込） ---- */}
        <Card padded={false} className="flex flex-col">
          <div className="border-b border-surface-border px-5 pb-4 pt-5">
            <SectionTitle
              sub={`連携元: ${SOURCE_SYSTEM} ※本番では基幹システムのAPI/CSV連携に置き換わります`}
              right={
                <Button variant="ai" size="sm" onClick={runSync} disabled={syncRunning || invoicesImported} className={syncRunning ? "ai-gradient-anim" : ""}>
                  {syncRunning ? (
                    <>
                      <Spinner /> 同期中… {Math.min(processedCount, feed.length)}/{feed.length}
                    </>
                  ) : invoicesImported ? (
                    <>
                      <Icon name="checkCircle" className="h-4 w-4" /> 同期済み
                    </>
                  ) : (
                    <>
                      <Icon name="briefcase" className="h-4 w-4" /> 債権データを同期
                    </>
                  )}
                </Button>
              }
            >
              債権データ連携
            </SectionTitle>
            {importSummary ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  <Icon name="checkCircle" className="h-3.5 w-3.5" /> {importSummary.registered}件を債権台帳へ同期
                </span>
                <WarnBadge>重複伝票スキップ {importSummary.duplicates}件</WarnBadge>
                <WarnBadge>欠損補完 {importSummary.warnings}件</WarnBadge>
              </div>
            ) : (
              <p className="mt-1 text-[12px] text-ink-muted">
                売上伝票{feed.length}件（未消込売掛金）が連携待ちです。同期時に重複・欠損の整合性チェックを行います。
              </p>
            )}
          </div>
          <div ref={feedRef} className="max-h-[430px] min-h-[200px] overflow-y-auto">
            {shownFeed.length === 0 ? (
              <p className="px-5 py-16 text-center text-sm text-ink-faint">
                「債権データを同期」を押すと、{SOURCE_SYSTEM}から債権レコードがここに流れ込みます…
              </p>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {shownFeed.map((rec, idx) => {
                  const processing = syncRunning && processedCount === idx + 1;
                  const isDup = rec.warn === "duplicate";
                  return (
                    <li key={`${rec.voucherNo}-${idx}`} className={`row-reveal flex items-center gap-3 px-5 py-2.5 ${isDup && !processing ? "opacity-60" : ""}`}>
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${isDup ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"}`}>
                        <Icon name="fileText" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[13px]">
                          <span className="font-mono font-medium text-ink">{rec.voucherNo}</span>
                          <span className="truncate text-ink-soft" title={rec.customerName}>{rec.customerName}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-ink-muted">
                          <span>{rec.invoiceNo}</span>
                          <span>{yen(rec.amount)}</span>
                          <span>期日 {formatDateShort(rec.dueDate)}</span>
                        </div>
                      </div>
                      <span className="flex-none">
                        {processing ? (
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
                        ) : isDup ? (
                          <WarnBadge>重複伝票スキップ</WarnBadge>
                        ) : rec.warn === "missing_staff" ? (
                          <WarnBadge>欠損補完</WarnBadge>
                        ) : (
                          <Icon name="checkCircle" className="h-4 w-4 text-emerald-500" strokeWidth={2.2} />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* ---- FBデータ取得 ---- */}
        <Card padded={false} className="flex flex-col">
          <div className="border-b border-surface-border px-5 pb-4 pt-5">
            <SectionTitle
              sub="全銀フォーマットの入出金明細を取得しパース（本番では銀行API/EBに置き換え）"
              right={
                <Button variant="ai" size="sm" onClick={runFbFetch} disabled={fbRunning || fbFetched} className={fbRunning ? "ai-gradient-anim" : ""}>
                  {fbRunning ? (
                    <>
                      <Spinner /> 取得中…
                    </>
                  ) : fbFetched ? (
                    <>
                      <Icon name="checkCircle" className="h-4 w-4" /> 取得済み
                    </>
                  ) : (
                    <>
                      <Icon name="landmark" className="h-4 w-4" /> FBデータ取得
                    </>
                  )}
                </Button>
              }
            >
              FBデータ取得
            </SectionTitle>
            {fbParsed && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  <Icon name="checkCircle" className="h-3.5 w-3.5" /> 入金明細 {payments.length}件（{yen(fbTotal)}）をパース
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 p-5">
            {/* 生データプレビュー */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                <span>全銀協レコードフォーマット（モック）</span>
                <span className="text-ink-faint">demo-bank.fb</span>
              </div>
              <div ref={rawRef} className="max-h-[150px] overflow-y-auto rounded-lg bg-navy-darker p-3 font-mono text-[11px] leading-relaxed text-accent-300/90">
                {rawShown === 0 ? (
                  <span className="text-white/30">「FBデータ取得」を押すと生データが表示されます…</span>
                ) : (
                  rawLines.slice(0, rawShown).map((l, i) => (
                    <div key={i} className="whitespace-nowrap">
                      {l}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* パース結果（正規化 A-3） */}
            {fbParsed && (
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="max-h-[240px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-surface-sunken">
                      <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                        <Th className="!py-2.5">入金日</Th>
                        <Th className="!py-2.5">振込名義（原文 → 正規化）</Th>
                        <Th className="!py-2.5 text-right">金額</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const norm = normalizePayerName(p.payerNameRaw);
                        // 取引先マスタの振込名義（正規名義以外）に一致した場合はバッジ表示
                        const hit = customers
                          .flatMap((c) => c.payerAliases.map((a) => ({ customer: c, alias: a })))
                          .find((x) => x.alias.alias === norm && x.alias.kind !== "official");
                        return (
                          <tr key={p.id} className="border-t border-line-subtle">
                            <Td className="!py-2 whitespace-nowrap tabular-nums text-ink-muted">{formatDateShort(p.paymentDate)}</Td>
                            <Td className="!py-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-ink-soft">{p.payerNameRaw}</span>
                                <Icon name="chevronRight" className="h-3 w-3 text-ink-faint" />
                                <span className="font-medium text-ink">{hit ? hit.customer.name : norm}</span>
                                {hit && <AliasKindBadge kind={hit.alias.kind} />}
                              </div>
                            </Td>
                            <Td className="!py-2 whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(p.amount)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ---- 債権台帳 ---- */}
      {invoicesImported && (
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-surface-border px-5 pb-3 pt-5">
            <SectionTitle sub="販売管理システムから同期した未消込債権の一覧。突合実行で消込済みに更新されます">
              債権台帳（{invoices.filter((i) => i.status !== "unsynced").length}件）
            </SectionTitle>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <Th>請求番号</Th>
                  <Th>売上伝票</Th>
                  <Th>取引先</Th>
                  <Th className="text-right">請求金額</Th>
                  <Th>請求日</Th>
                  <Th>支払期日</Th>
                  <Th>担当営業</Th>
                  <Th>ステータス</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const c = customerOf(customers, i.customerId);
                  return (
                    <tr key={i.invoiceNo} className="row-reveal border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                      <Td className="whitespace-nowrap font-mono text-[13px] text-ink-soft">{i.invoiceNo}</Td>
                      <Td className="whitespace-nowrap font-mono text-[12px] text-ink-muted">{i.voucherNo}</Td>
                      <Td>
                        <span className="font-medium text-ink">{c?.name}</span>
                        <span className="ml-2 text-[11px] text-ink-faint">{c?.customerId}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(i.amount)}</Td>
                      <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDate(i.issueDate)}</Td>
                      <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDate(i.dueDate)}</Td>
                      <Td>
                        {i.staffName ? (
                          <span className="text-ink-soft">{i.staffName}</span>
                        ) : (
                          <WarnBadge>未設定</WarnBadge>
                        )}
                      </Td>
                      <Td>
                        <InvoiceStatusBadge status={i.status} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
