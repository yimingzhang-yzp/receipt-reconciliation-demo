"use client";

import { useMemo } from "react";
import { useDemoStore } from "@/lib/store";
import { diffDays } from "@/lib/dates";
import { fmtDuration, formatDate, yen } from "@/lib/format";
import { agingBucket } from "@/lib/matching";
import { downloadCsv } from "@/lib/csv";
import { AgentAvatar, ActorBadge } from "@/components/badges";
import { KpiCard } from "@/components/Kpi";
import { Button, Card, HeroBanner, LinkButton, SectionTitle } from "@/components/ui";
import { ProcessPipeline } from "@/components/ai";
import { Icon } from "@/components/icons";
import { Gauge, DonutChart, VBarChart, HBarChart, CHART } from "@/components/charts";
import { INVOICE_STATUS_LABEL, METHOD_LABEL } from "@/lib/format";

export default function DashboardPage() {
  const invoices = useDemoStore((s) => s.invoices);
  const payments = useDemoStore((s) => s.payments);
  const dunning = useDemoStore((s) => s.dunning);
  const clearings = useDemoStore((s) => s.clearings);
  const audit = useDemoStore((s) => s.audit);
  const demoDate = useDemoStore((s) => s.demoDate);
  const invoicesImported = useDemoStore((s) => s.invoicesImported);
  const fbFetched = useDemoStore((s) => s.fbFetched);
  const matchingDone = useDemoStore((s) => s.matchingDone);

  const kpi = useMemo(() => {
    const cleared = invoices.filter((i) => i.status === "cleared_auto" || i.status === "cleared_manual");
    const openList = invoices.filter((i) => i.status !== "cleared_auto" && i.status !== "cleared_manual");
    const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
    const clearedAmount = cleared.reduce((s, i) => s + i.amount, 0);
    const openAmount = openList.reduce((s, i) => s + i.amount, 0);
    const rateCount = invoices.length > 0 ? cleared.length / invoices.length : 0;
    const rateAmount = totalAmount > 0 ? clearedAmount / totalAmount : 0;
    const autoCleared = invoices.filter((i) => i.status === "cleared_auto").length;
    const autoRate = payments.length > 0 ? Math.round((payments.filter((p) => p.status === "matched_auto").length / payments.length) * 100) : 0;
    const reviewCount = payments.filter((p) => p.status === "in_review" || p.status === "unapplied").length;
    const dunningInvoices = dunning
      .map((d) => invoices.find((i) => i.invoiceNo === d.invoiceNo))
      .filter((i): i is NonNullable<typeof i> => !!i);
    const dunningAmount = dunningInvoices.reduce((s, i) => s + i.amount, 0);
    const savedMinutes =
      clearings.filter((c) => c.method === "auto").length * 20 + clearings.filter((c) => c.method !== "auto").length * 10;
    return {
      openCount: openList.length,
      openAmount,
      cleared: cleared.length,
      rateCount,
      rateAmount,
      autoCleared,
      autoRate,
      reviewCount,
      dunningCount: dunningInvoices.length,
      dunningAmount,
      savedMinutes,
      dunningInvoices,
    };
  }, [invoices, payments, dunning, clearings]);

  const pipeline = useMemo(() => {
    const registered = invoices.filter((i) => i.status !== "folder").length;
    const fetched = payments.filter((p) => p.status !== "unfetched").length;
    const matched = payments.filter((p) => !["unfetched", "unmatched"].includes(p.status)).length;
    const cleared = payments.filter((p) => ["matched_auto", "matched_manual", "transferred"].includes(p.status)).length;
    return [
      { key: "invoice", label: "債権登録", count: registered },
      { key: "fb", label: "入金明細", count: fetched },
      { key: "matched", label: "突合済み", count: matched },
      { key: "cleared", label: "消込完了", count: cleared },
    ];
  }, [invoices, payments]);

  const donut = useMemo(() => {
    const c = (st: string[]) => payments.filter((p) => st.includes(p.status)).length;
    return [
      { label: "自動消込", value: c(["matched_auto"]), color: CHART.emerald },
      { label: "目検・承認消込", value: c(["matched_manual", "transferred"]), color: CHART.sky },
      { label: "要目検", value: c(["in_review", "pending_approval"]), color: CHART.amber },
      { label: "保留", value: c(["unapplied"]), color: CHART.slate },
      { label: "突合前", value: c(["unmatched", "unfetched"]), color: CHART.grid },
    ].filter((d) => d.value > 0);
  }, [payments]);

  const aging = useMemo(() => {
    const buckets = { b30: 0, b60: 0, b61plus: 0 };
    for (const inv of kpi.dunningInvoices) {
      buckets[agingBucket(diffDays(inv.dueDate, demoDate))] += inv.amount;
    }
    return [
      { label: "〜30日", value: buckets.b30 },
      { label: "31〜60日", value: buckets.b60 },
      { label: "61日〜", value: buckets.b61plus },
    ];
  }, [kpi.dunningInvoices, demoDate]);

  const overdueBars = useMemo(
    () =>
      [...kpi.dunningInvoices]
        .sort((a, b) => b.amount - a.amount)
        .map((i, idx) => ({ label: i.customerName, value: i.amount, color: idx === 0 ? CHART.rose : CHART.orange })),
    [kpi.dunningInvoices],
  );

  const recent = useMemo(() => [...audit].slice(-6).reverse(), [audit]);

  function downloadMonthlyReport() {
    const rows: (string | number)[][] = [
      ["請求番号", "取引先", "請求金額", "請求日", "支払期日", "ステータス", "消込方式", "実行者", "消込日時"],
      ...invoices.map((i) => {
        const clr = clearings.find((c) => c.invoiceNos.includes(i.invoiceNo));
        return [
          i.invoiceNo,
          i.customerName,
          i.amount,
          formatDate(i.issueDate),
          formatDate(i.dueDate),
          INVOICE_STATUS_LABEL[i.status],
          clr ? METHOD_LABEL[clr.method] : "",
          i.clearedBy ?? "",
          i.clearedAtLabel ?? "",
        ];
      }),
    ];
    downloadCsv(`消込結果サマリ_${demoDate}.csv`, rows);
  }

  // フェーズに応じた次アクションの案内
  const guide = !invoicesImported
    ? { text: "請求書フォルダに31ファイルの未取込請求書があります。まずは債権台帳へ取り込みましょう。", href: "/import", cta: "データ取込へ" }
    : !fbFetched
      ? { text: "債権台帳の準備ができました。銀行からFBデータ（入金明細）を取得しましょう。", href: "/import", cta: "FBデータを取得" }
      : !matchingDone
        ? { text: "請求と入金が揃いました。AIによる自動突合を実行すると、消込結果が分類されます。", href: "/matching", cta: "自動突合を実行" }
        : null;

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="RECONCILIATION ANALYTICS"
        title="消込ダッシュボード"
        description="売掛金の消込状況・滞留債権・工数削減効果をリアルタイムに可視化します。突合を実行するたびにKPIが更新されます。"
        actions={
          matchingDone ? (
            <Button variant="secondary" size="sm" className="border-white/20 bg-white/[0.06] text-[#B7C7D8] hover:bg-white/[0.12]" onClick={downloadMonthlyReport}>
              <Icon name="download" className="h-4 w-4" /> 月次レポート（CSV）
            </Button>
          ) : undefined
        }
        right={
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">未消込債権残高</div>
            <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-white">{yen(kpi.openAmount)}</div>
            <div className="mt-1.5 text-[12px] tabular-nums text-[#B7C7D8]">
              未消込 {kpi.openCount}件 ・ 消込済 {kpi.cleared}件
            </div>
          </div>
        }
      />

      {guide ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center">
          <AgentAvatar size="h-9 w-9" />
          <p className="flex-1 text-sm text-ink-soft">{guide.text}</p>
          <LinkButton href={guide.href} variant="primary" size="sm">
            {guide.cta}
            <Icon name="chevronRight" className="h-4 w-4" />
          </LinkButton>
        </div>
      ) : null}

      {/* KPI 4指標（G-1） */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <KpiCard
          label="消込率（件数）"
          value={`${Math.round(kpi.rateCount * 100)}%`}
          tone="emerald"
          accent
          icon={<Icon name="gauge" className="h-[18px] w-[18px]" />}
          sub={`請求${invoices.length}件中 ${kpi.cleared}件を消込済み`}
        />
        <KpiCard
          label="要確認（目検・保留）"
          value={`${kpi.reviewCount}件`}
          tone="amber"
          icon={<Icon name="eye" className="h-[18px] w-[18px]" />}
          sub="名義ゆれ・合算・過入金など"
        />
        <KpiCard
          label="未入金（督促対象）"
          value={`${kpi.dunningCount}件`}
          tone="red"
          icon={<Icon name="mailAlert" className="h-[18px] w-[18px]" />}
          sub={`滞留金額 ${yen(kpi.dunningAmount)}`}
        />
        <KpiCard
          label="想定工数削減"
          value={fmtDuration(kpi.savedMinutes)}
          tone="brand"
          icon={<Icon name="zap" className="h-[18px] w-[18px]" />}
          sub="手作業換算: 自動20分・目検10分/件"
        />
      </div>

      {/* 処理パイプライン */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-soft">処理状況</h2>
          <span className="text-xs text-ink-muted">
            消込済金額
            <span className="ml-2 font-semibold tabular-nums text-ink">{yen(invoices.filter((i) => i.status.startsWith("cleared")).reduce((s, i) => s + i.amount, 0))}</span>
          </span>
        </div>
        <ProcessPipeline stages={pipeline} />
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <SectionTitle sub="消込済金額 ÷ 請求総額">消込率（金額）</SectionTitle>
          <div className="flex justify-center py-2">
            <Gauge value={kpi.rateAmount} label={`自動消込率 ${kpi.autoRate}%（入金ベース）`} />
          </div>
        </Card>
        <Card>
          <SectionTitle sub="入金明細25件の処理内訳">突合結果の構成</SectionTitle>
          {donut.length > 0 ? (
            <DonutChart data={donut} centerValue={String(payments.length)} centerLabel="入金" />
          ) : (
            <p className="py-6 text-center text-sm text-ink-faint">FBデータ取得後に表示されます</p>
          )}
        </Card>
        <Card>
          <SectionTitle sub="期日超過の滞留金額（B-6）">エイジング</SectionTitle>
          {kpi.dunningCount > 0 ? (
            <VBarChart
              data={aging}
              colors={[CHART.amber, CHART.orange, CHART.rose]}
              height={190}
              format={(v) => (v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString())}
            />
          ) : (
            <p className="py-6 text-center text-sm text-ink-faint">突合実行後、未入金債権がここに表示されます</p>
          )}
        </Card>
      </div>

      {/* 滞留債権 + 直近アクティビティ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle sub="督促対象・金額の大きい順">滞留債権（取引先別）</SectionTitle>
          <HBarChart data={overdueBars} format={(v) => yen(v)} emptyLabel="督促対象はありません" />
          {kpi.dunningCount > 0 && (
            <div className="mt-4 border-t border-line pt-3 text-right">
              <LinkButton href="/dunning" variant="ghost" size="sm">
                督促管理へ <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </LinkButton>
            </div>
          )}
        </Card>
        <Card padded={false}>
          <div className="border-b border-surface-border px-5 pb-3 pt-5">
            <SectionTitle sub="全操作は監査証跡に記録されます（C-3）">直近アクティビティ</SectionTitle>
          </div>
          <ul className="divide-y divide-line-subtle">
            {recent.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                <ActorBadge actor={e.actor} />
                <p className="min-w-0 flex-1 truncate text-[13px] text-ink-soft" title={e.message}>
                  {e.message}
                </p>
                <span className="flex-none text-[11px] tabular-nums text-ink-faint">{e.atLabel}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3 text-right">
            <LinkButton href="/audit" variant="ghost" size="sm">
              監査証跡をすべて見る <Icon name="chevronRight" className="h-3.5 w-3.5" />
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
