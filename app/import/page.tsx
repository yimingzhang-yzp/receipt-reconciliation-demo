"use client";

import { useMemo, useRef, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { buildFbRawLines, fakeFileSize, FOLDER_DUPLICATE } from "@/lib/data";
import { normalizePayerName } from "@/lib/matching";
import { formatDate, formatDateShort, yen } from "@/lib/format";
import { Button, Card, HeroBanner, LinkButton, SectionTitle, Spinner, Td, Th } from "@/components/ui";
import { InvoiceStatusBadge, WarnBadge, DictKindBadge, AgentAvatar } from "@/components/badges";
import { Icon } from "@/components/icons";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FolderFile = {
  fileName: string;
  fileKind: "pdf" | "csv";
  invoiceNo: string | null; // null = 重複ファイル
  customerName: string;
  amount: number | null;
  warning: string | null;
};

export default function ImportPage() {
  const invoices = useDemoStore((s) => s.invoices);
  const payments = useDemoStore((s) => s.payments);
  const dict = useDemoStore((s) => s.dict);
  const invoicesImported = useDemoStore((s) => s.invoicesImported);
  const fbFetched = useDemoStore((s) => s.fbFetched);
  const matchingDone = useDemoStore((s) => s.matchingDone);
  const importInvoices = useDemoStore((s) => s.importInvoices);
  const fetchFb = useDemoStore((s) => s.fetchFb);
  const demoDate = useDemoStore((s) => s.demoDate);

  // ---- 請求書フォルダ（A-1）----
  const [importRunning, setImportRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(invoicesImported ? 999 : 0);
  const [importSummary, setImportSummary] = useState<{ registered: number; duplicates: number; warnings: number } | null>(
    invoicesImported ? { registered: 30, duplicates: 1, warnings: 1 } : null,
  );

  const folderFiles = useMemo<FolderFile[]>(() => {
    const files: FolderFile[] = invoices.map((i) => ({
      fileName: i.fileName,
      fileKind: i.fileKind,
      invoiceNo: i.invoiceNo,
      customerName: i.customerName,
      amount: i.amount,
      warning: i.warning,
    }));
    // 重複ファイルを2番目の直後に混ぜる（A-4 バリデーションのデモ）
    files.splice(2, 0, {
      fileName: FOLDER_DUPLICATE.fileName,
      fileKind: FOLDER_DUPLICATE.fileKind,
      invoiceNo: null,
      customerName: "株式会社デルタ食品",
      amount: null,
      warning: `請求番号 ${FOLDER_DUPLICATE.duplicateOf} と重複するため取込をスキップ`,
    });
    return files;
  }, [invoices]);

  async function runImport() {
    if (importRunning || invoicesImported) return;
    setImportRunning(true);
    for (let i = 0; i < folderFiles.length; i++) {
      setProcessedCount(i + 1);
      await sleep(75);
    }
    await sleep(250);
    const summary = importInvoices();
    setImportSummary(summary);
    setImportRunning(false);
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

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="DATA INTAKE"
        title="データ取込"
        description="請求書フォルダからの債権台帳の作成と、銀行FBデータ（全銀フォーマット）の取得・正規化を行います。本番では請求書AI-OCRと銀行APIに置き換わる部分です。"
      />

      {bothReady && !matchingDone && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center">
          <AgentAvatar size="h-9 w-9" />
          <p className="flex-1 text-sm text-ink-soft">
            債権台帳（{invoices.filter((i) => i.status !== "folder").length}件）と入金明細（{payments.length}件）が揃いました。自動突合を実行できます。
          </p>
          <LinkButton href="/matching" variant="ai" size="md">
            <Icon name="sparkles" className="h-4 w-4" /> 自動突合を実行
          </LinkButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ---- 請求書フォルダ ---- */}
        <Card padded={false} className="flex flex-col">
          <div className="border-b border-surface-border px-5 pb-4 pt-5">
            <SectionTitle
              sub="共有フォルダの請求書ファイルから請求情報を抽出（本番ではAI-OCR）"
              right={
                <Button variant="ai" size="sm" onClick={runImport} disabled={importRunning || invoicesImported} className={importRunning ? "ai-gradient-anim" : ""}>
                  {importRunning ? (
                    <>
                      <Spinner /> 抽出中… {Math.min(processedCount, folderFiles.length)}/{folderFiles.length}
                    </>
                  ) : invoicesImported ? (
                    <>
                      <Icon name="checkCircle" className="h-4 w-4" /> 取込済み
                    </>
                  ) : (
                    <>
                      <Icon name="sparkles" className="h-4 w-4" /> 取込実行
                    </>
                  )}
                </Button>
              }
            >
              請求書フォルダ
            </SectionTitle>
            {importSummary && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  <Icon name="checkCircle" className="h-3.5 w-3.5" /> {importSummary.registered}件を債権台帳へ登録
                </span>
                <WarnBadge>重複スキップ {importSummary.duplicates}件</WarnBadge>
                <WarnBadge>欠損補完 {importSummary.warnings}件</WarnBadge>
              </div>
            )}
          </div>
          <div className="max-h-[430px] overflow-y-auto">
            <ul className="divide-y divide-line-subtle">
              {folderFiles.map((f, idx) => {
                const processed = invoicesImported || processedCount > idx;
                const processing = importRunning && processedCount === idx + 1;
                const isDup = f.invoiceNo === null;
                return (
                  <li key={f.fileName} className={`flex items-center gap-3 px-5 py-2.5 ${processed && isDup ? "opacity-60" : ""}`}>
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${f.fileKind === "pdf" ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"}`}>
                      <Icon name="fileText" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink" title={f.fileName}>
                        {f.fileName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-muted">
                        <span className="uppercase">{f.fileKind}</span>
                        <span>{fakeFileSize(idx)}</span>
                        {processed && !isDup && f.amount !== null && (
                          <span className="tabular-nums text-ink-soft">
                            {f.customerName} ／ {yen(f.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex-none">
                      {processing ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
                      ) : processed ? (
                        isDup ? (
                          <WarnBadge>重複スキップ</WarnBadge>
                        ) : f.warning ? (
                          <WarnBadge>欠損補完</WarnBadge>
                        ) : (
                          <Icon name="checkCircle" className="h-4 w-4 text-emerald-500" strokeWidth={2.2} />
                        )
                      ) : (
                        <span className="text-[11px] text-ink-faint">未取込</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
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
                        const hit = dict.find((e) => e.from === norm);
                        return (
                          <tr key={p.id} className="border-t border-line-subtle">
                            <Td className="!py-2 whitespace-nowrap tabular-nums text-ink-muted">{formatDateShort(p.paymentDate)}</Td>
                            <Td className="!py-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-ink-soft">{p.payerNameRaw}</span>
                                <Icon name="chevronRight" className="h-3 w-3 text-ink-faint" />
                                <span className="font-medium text-ink">{hit ? hit.to : norm}</span>
                                {hit && <DictKindBadge kind={hit.kind} />}
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
            <SectionTitle sub="取込済みの請求一覧（未消込リスト）。突合実行で消込済みに更新されます">
              債権台帳（{invoices.filter((i) => i.status !== "folder").length}件）
            </SectionTitle>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <Th>請求番号</Th>
                  <Th>取引先</Th>
                  <Th className="text-right">請求金額</Th>
                  <Th>請求日</Th>
                  <Th>支払期日</Th>
                  <Th>担当営業</Th>
                  <Th>ステータス</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.invoiceNo} className="row-reveal border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                    <Td className="whitespace-nowrap font-mono text-[13px] text-ink-soft">{i.invoiceNo}</Td>
                    <Td>
                      <span className="font-medium text-ink">{i.customerName}</span>
                      <span className="ml-2 text-[11px] text-ink-faint">{i.customerKana}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
