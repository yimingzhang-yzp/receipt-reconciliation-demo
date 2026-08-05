"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { diffDays } from "@/lib/dates";
import { customerNameOf, formatDate, formatDateShort, yen } from "@/lib/format";
import { Button, Card, EmptyState, HeroBanner, LinkButton, Spinner, Td, Th } from "@/components/ui";
import { AIResultSummary, AiOrbHero } from "@/components/ai";
import {
  AgingBadge,
  ClassificationBadge,
  DunningStatusBadge,
  MatchTypeBadge,
  PaymentStatusBadge,
  ScoreBadge,
} from "@/components/badges";
import { Icon } from "@/components/icons";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RUN_STEPS = [
  "振込名義の正規化と取引先マスタ（振込名義）の照合",
  "完全一致マッチング（名義×金額×期日±5営業日）",
  "振込手数料差の許容判定（110〜880円）",
  "類似名義・合算入金・過入金の検知",
  "期日超過・未入金債権の抽出",
  "結果の分類と消込ログの記録",
];

type Tab = "cleared" | "review" | "unapplied" | "dunning";

export default function MatchingPage() {
  const customers = useDemoStore((s) => s.customers);
  const invoices = useDemoStore((s) => s.invoices);
  const payments = useDemoStore((s) => s.payments);
  const results = useDemoStore((s) => s.results);
  const dunning = useDemoStore((s) => s.dunning);
  const invoicesImported = useDemoStore((s) => s.invoicesImported);
  const fbFetched = useDemoStore((s) => s.fbFetched);
  const matchingDone = useDemoStore((s) => s.matchingDone);
  const lastRun = useDemoStore((s) => s.lastRun);
  const executeMatching = useDemoStore((s) => s.executeMatching);
  const demoDate = useDemoStore((s) => s.demoDate);

  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>("cleared");

  const ready = invoicesImported && fbFetched;

  async function run() {
    if (running || !ready) return;
    setRunning(true);
    setStep(0);
    for (let i = 0; i < RUN_STEPS.length; i++) {
      setStep(i);
      await sleep(i === 3 ? 750 : 520);
    }
    executeMatching();
    setStep(RUN_STEPS.length);
    await sleep(350);
    setRunning(false);
    setTab("cleared");
  }

  // ---- 集計 ----
  const cleared = useMemo(
    () => payments.filter((p) => ["matched_auto", "matched_manual"].includes(p.status)),
    [payments],
  );
  const review = useMemo(
    () => payments.filter((p) => ["in_review", "pending_approval"].includes(p.status)),
    [payments],
  );
  const unapplied = useMemo(
    () => payments.filter((p) => ["unapplied", "transferred"].includes(p.status)),
    [payments],
  );
  const dunningRows = useMemo(
    () =>
      dunning
        .map((d) => ({ d, inv: invoices.find((i) => i.invoiceNo === d.invoiceNo) }))
        .filter((x): x is { d: (typeof dunning)[number]; inv: NonNullable<(typeof invoices)[number]> } => !!x.inv)
        .sort((a, b) => b.inv.amount - a.inv.amount),
    [dunning, invoices],
  );

  const invoiceOf = (no: string) => invoices.find((i) => i.invoiceNo === no);
  const nameOf = (no: string) => {
    const inv = invoiceOf(no);
    return inv ? customerNameOf(customers, inv.customerId) : "";
  };

  const TABS: { key: Tab; label: string; count: number; dot: string }[] = [
    { key: "cleared", label: "消込済み", count: cleared.length, dot: "bg-emerald-500" },
    { key: "review", label: "要目検", count: review.length, dot: "bg-amber-500" },
    { key: "unapplied", label: "保留・不明入金", count: unapplied.length, dot: "bg-ink-faint" },
    { key: "dunning", label: "督促対象", count: dunningRows.length, dot: "bg-rose-500" },
  ];

  if (!ready) {
    return (
      <div className="space-y-8">
        <HeroBanner
          eyebrow="AI MATCHING"
          title="突合結果"
          description="請求データと入金明細を照合し、自動消込・要目検・保留・督促対象に分類します。"
        />
        <Card>
          <EmptyState
            icon={<Icon name="arrowLeftRight" className="h-10 w-10" />}
            title="突合の前にデータ取込が必要です"
            description="「データ取込」で請求書の取込とFBデータの取得を行うと、自動突合を実行できます。"
            action={
              <LinkButton href="/import" variant="primary">
                データ取込へ <Icon name="chevronRight" className="h-4 w-4" />
              </LinkButton>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="AI MATCHING"
        title="突合結果"
        description="名義・金額・日付をもとに請求と入金を照合し、信頼度スコアで分類します。スコア95以上は自動消込、60〜94は目検、紐付かない入金は保留、期日超過は督促対象です。"
        actions={
          <>
            <Button
              size="lg"
              variant="ai"
              className={running ? "ai-gradient-anim" : ""}
              onClick={run}
              disabled={running || (matchingDone && payments.every((p) => !["unmatched", "in_review", "unapplied"].includes(p.status)))}
            >
              {running ? (
                <>
                  <Spinner /> AIが突合中…
                </>
              ) : matchingDone ? (
                <>
                  <Icon name="refresh" className="h-[18px] w-[18px]" /> 再突合を実行
                </>
              ) : (
                <>
                  <Icon name="sparkles" className="h-[18px] w-[18px]" /> 自動突合を実行
                </>
              )}
            </Button>
            {matchingDone && !running && (
              <span className="text-[12px] text-[#8FB0CC]">
                マスタ学習後の再突合では、学習済み名義が自動一致します
              </span>
            )}
          </>
        }
        right={
          matchingDone && lastRun ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">前回実行</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-white">{lastRun.atLabel}</div>
              <div className="mt-1 text-[12px] tabular-nums text-[#B7C7D8]">
                緑{lastRun.auto} / 黄{lastRun.review} / 灰{lastRun.unapplied} / 赤{lastRun.dunning}
              </div>
            </div>
          ) : undefined
        }
      />

      {running ? (
        <AiOrbHero
          title="AIが請求と入金を突合しています"
          subtitle={`債権台帳 ${invoices.filter((i) => i.status !== "unsynced").length}件 × 入金明細 ${payments.length}件`}
          steps={RUN_STEPS}
          current={step}
          running={running}
        />
      ) : !matchingDone ? (
        <Card>
          <EmptyState
            icon={<Icon name="sparkles" className="h-10 w-10" />}
            title="準備完了 — 自動突合を実行してください"
            description={`債権台帳 ${invoices.filter((i) => i.status !== "unsynced").length}件と入金明細 ${payments.length}件が待機中です。「自動突合を実行」を押すと、AIが照合と分類を行います。`}
            action={
              <Button variant="ai" size="lg" onClick={run}>
                <Icon name="sparkles" className="h-[18px] w-[18px]" /> 自動突合を実行
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {lastRun && (
            <AIResultSummary
              title="突合が完了しました"
              subtitle="スコア95以上は自動消込し、消込ログ・仕訳を記録済み。要目検は担当者の確認をお願いします。"
              stats={[
                { label: "自動消込", value: `${lastRun.auto}件`, tone: "emerald" },
                { label: "要目検", value: `${lastRun.review}件`, tone: "amber" },
                { label: "保留", value: `${lastRun.unapplied}件`, tone: "default" },
                { label: "督促対象", value: `${lastRun.dunning}件`, tone: "rose" },
              ]}
            />
          )}

          {/* タブ */}
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition-all duration-150 ease-smooth ${
                  tab === t.key
                    ? "border-brand-300 bg-brand-50 text-brand-700 shadow-sm"
                    : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                {t.label}
                <span className="tabular-nums text-ink-muted">{t.count}</span>
              </button>
            ))}
          </div>

          {/* ---- 消込済み ---- */}
          {tab === "cleared" && (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <Th>入金日</Th>
                      <Th>振込名義</Th>
                      <Th className="text-right">入金額</Th>
                      <Th>消込した請求</Th>
                      <Th>タイプ</Th>
                      <Th>スコア</Th>
                      <Th>状態</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleared.map((p) => {
                      const r = results[p.id];
                      return (
                        <tr key={p.id} className="row-reveal border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                          <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDateShort(p.paymentDate)}</Td>
                          <Td>
                            <div className="font-mono text-[13px] text-ink-soft">{p.payerNameRaw}</div>
                            <div className="text-[11px] text-ink-muted">{nameOf(p.matchedInvoiceNos[0])}</div>
                          </Td>
                          <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(p.amount)}</Td>
                          <Td>
                            <span className="font-mono text-[13px] text-ink">{p.matchedInvoiceNos.join("・")}</span>
                            {r?.best?.feeAssumed && r.best.amountDiff !== 0 && (
                              <span className="ml-2 text-[11px] text-amber-600">手数料 {yen(Math.abs(r.best.amountDiff))} 控除</span>
                            )}
                            {r?.best && r.best.amountDiff > 0 && !r.best.feeAssumed && (
                              <span className="ml-2 text-[11px] text-brand-600">仮受金 {yen(r.best.amountDiff)} 振替</span>
                            )}
                          </Td>
                          <Td>{r?.best ? <MatchTypeBadge type={r.best.matchType} /> : null}</Td>
                          <Td>{r?.best ? <ScoreBadge score={r.best.score} /> : null}</Td>
                          <Td>
                            <PaymentStatusBadge status={p.status} />
                          </Td>
                        </tr>
                      );
                    })}
                    {cleared.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">
                          消込済みの入金はまだありません。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ---- 要目検 ---- */}
          {tab === "review" && (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1020px] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <Th>入金日</Th>
                      <Th>振込名義</Th>
                      <Th className="text-right">入金額</Th>
                      <Th>候補請求</Th>
                      <Th>タイプ</Th>
                      <Th>スコア</Th>
                      <Th>AI判断（要約）</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {review.map((p) => {
                      const r = results[p.id];
                      const best = r?.best;
                      return (
                        <tr key={p.id} className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                          <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDateShort(p.paymentDate)}</Td>
                          <Td className="font-mono text-[13px] text-ink-soft">{p.payerNameRaw}</Td>
                          <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(p.amount)}</Td>
                          <Td>
                            {best ? (
                              <>
                                <span className="font-mono text-[13px] text-ink">{best.invoiceNos.join("・")}</span>
                                <div className="text-[11px] text-ink-muted">{nameOf(best.invoiceNos[0])}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </Td>
                          <Td>{best ? <MatchTypeBadge type={best.matchType} /> : null}</Td>
                          <Td>{best ? <ScoreBadge score={best.score} /> : null}</Td>
                          <Td className="max-w-[260px]">
                            <span className="block truncate text-[12px] text-ink-muted" title={best?.reasons.join(" / ")}>
                              {best?.reasons[0] ?? "—"}
                            </span>
                            {p.status === "pending_approval" && (
                              <span className="mt-1 inline-block">
                                <PaymentStatusBadge status={p.status} />
                              </span>
                            )}
                          </Td>
                          <Td>
                            {p.status === "in_review" ? (
                              <LinkButton href={`/review?id=${p.id}`} variant="primary" size="sm">
                                目検へ <Icon name="chevronRight" className="h-3.5 w-3.5" />
                              </LinkButton>
                            ) : (
                              <LinkButton href="/approval" variant="secondary" size="sm">
                                承認状況
                              </LinkButton>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                    {review.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-ink-muted">
                          要目検の案件はありません。すべて処理済みです。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ---- 保留・不明入金 ---- */}
          {tab === "unapplied" && (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <Th>入金日</Th>
                      <Th>振込名義</Th>
                      <Th className="text-right">入金額</Th>
                      <Th>取扱銀行</Th>
                      <Th>状態</Th>
                      <Th>AI判断</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {unapplied.map((p) => (
                      <tr key={p.id} className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                        <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDateShort(p.paymentDate)}</Td>
                        <Td className="font-mono text-[13px] text-ink-soft">{p.payerNameRaw}</Td>
                        <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(p.amount)}</Td>
                        <Td className="text-ink-muted">{p.bankName}</Td>
                        <Td>
                          <PaymentStatusBadge status={p.status} />
                        </Td>
                        <Td className="max-w-[300px] text-[12px] text-ink-muted">
                          {results[p.id]?.best
                            ? results[p.id].best!.reasons[0]
                            : "債権台帳のどの請求とも名義・金額が一致しませんでした"}
                        </Td>
                        <Td>
                          {p.status === "unapplied" && (
                            <LinkButton href={`/review?id=${p.id}`} variant="primary" size="sm">
                              処理する <Icon name="chevronRight" className="h-3.5 w-3.5" />
                            </LinkButton>
                          )}
                        </Td>
                      </tr>
                    ))}
                    {unapplied.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">
                          保留中の入金はありません。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ---- 督促対象 ---- */}
          {tab === "dunning" && (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <Th>請求番号</Th>
                      <Th>取引先</Th>
                      <Th className="text-right">請求金額</Th>
                      <Th>支払期日</Th>
                      <Th>エイジング</Th>
                      <Th>督促状況</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {dunningRows.map(({ d, inv }) => (
                      <tr key={d.invoiceNo} className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                        <Td className="whitespace-nowrap font-mono text-[13px] text-ink-soft">{inv.invoiceNo}</Td>
                        <Td className="font-medium text-ink">{customerNameOf(customers, inv.customerId)}</Td>
                        <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(inv.amount)}</Td>
                        <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDate(inv.dueDate)}</Td>
                        <Td>
                          <AgingBadge overdueDays={diffDays(inv.dueDate, demoDate)} />
                        </Td>
                        <Td>
                          <DunningStatusBadge status={d.status} />
                        </Td>
                        <Td>
                          <LinkButton href="/dunning" variant="primary" size="sm">
                            督促管理へ <Icon name="chevronRight" className="h-3.5 w-3.5" />
                          </LinkButton>
                        </Td>
                      </tr>
                    ))}
                    {dunningRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">
                          督促対象はありません。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
