"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { ACTOR_LABEL, formatDate, METHOD_LABEL, yen } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import type { AuditActor } from "@/lib/types";
import { Button, Card, EmptyState, HeroBanner, Td, Th } from "@/components/ui";
import { ActorBadge, MethodBadge, ScoreBadge } from "@/components/badges";
import { Icon } from "@/components/icons";

type Tab = "clearing" | "journal" | "timeline";

export default function AuditPage() {
  const clearings = useDemoStore((s) => s.clearings);
  const journals = useDemoStore((s) => s.journals);
  const audit = useDemoStore((s) => s.audit);
  const demoDate = useDemoStore((s) => s.demoDate);

  const [tab, setTab] = useState<Tab>("clearing");
  const [query, setQuery] = useState("");
  const [actorFilter, setActorFilter] = useState<AuditActor | "all">("all");

  const timeline = useMemo(() => {
    let list = [...audit].reverse();
    if (actorFilter !== "all") list = list.filter((e) => e.actor === actorFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) => `${e.message} ${e.action} ${e.refId ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [audit, query, actorFilter]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "clearing", label: "消込ログ", count: clearings.length },
    { key: "journal", label: "仕訳データ", count: journals.length },
    { key: "timeline", label: "操作タイムライン", count: audit.length },
  ];

  function downloadClearingCsv() {
    downloadCsv(`消込ログ_${demoDate}.csv`, [
      ["ID", "実行日時", "実行者", "方式", "消込請求", "入金ID", "消込額", "手数料", "振替額", "スコア", "照合根拠"],
      ...clearings.map((c) => [
        c.id,
        c.executedAtLabel,
        c.executedBy,
        METHOD_LABEL[c.method],
        c.invoiceNos.join("・"),
        c.paymentId,
        c.clearedAmount,
        c.feeAmount,
        c.transferAmount,
        c.score,
        c.basis,
      ]),
    ]);
  }

  function downloadJournalCsv() {
    downloadCsv(`仕訳データ_${demoDate}.csv`, [
      ["仕訳ID", "日付", "借方科目", "借方金額", "貸方科目", "貸方金額", "摘要"],
      ...journals.flatMap((j) => {
        const n = Math.max(j.debits.length, j.credits.length);
        return Array.from({ length: n }, (_, i) => [
          i === 0 ? j.id : "",
          i === 0 ? formatDate(j.date) : "",
          j.debits[i]?.account ?? "",
          j.debits[i]?.amount ?? "",
          j.credits[i]?.account ?? "",
          j.credits[i]?.amount ?? "",
          i === 0 ? j.memo : "",
        ]);
      }),
    ]);
  }

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="AUDIT TRAIL"
        title="消込ログ・監査証跡"
        description="いつ・誰が・どの根拠で消し込んだかをすべて記録します（内部統制強化）。仕訳データはCSVで会計システムへ連携できます（デモではダウンロードのみ）。"
        right={
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">記録済みイベント</div>
            <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-white">{audit.length}</div>
          </div>
        }
      />

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
            {t.label}
            <span className="tabular-nums text-ink-muted">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ---- 消込ログ（C-1） ---- */}
      {tab === "clearing" && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-3.5">
            <span className="text-[13px] text-ink-muted">実行者・日時・照合根拠・スコアを記録（C-1）</span>
            <Button variant="secondary" size="sm" onClick={downloadClearingCsv} disabled={clearings.length === 0}>
              <Icon name="download" className="h-4 w-4" /> CSVダウンロード
            </Button>
          </div>
          {clearings.length === 0 ? (
            <EmptyState icon={<Icon name="shield" className="h-10 w-10" />} title="消込ログはまだありません" description="突合を実行すると自動消込のログがここに記録されます。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                    <Th>ID</Th>
                    <Th>実行日時</Th>
                    <Th>実行者</Th>
                    <Th>方式</Th>
                    <Th>消込請求</Th>
                    <Th className="text-right">消込額</Th>
                    <Th className="text-right">手数料</Th>
                    <Th>スコア</Th>
                    <Th>照合根拠</Th>
                  </tr>
                </thead>
                <tbody>
                  {clearings.map((c) => (
                    <tr key={c.id} className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                      <Td className="whitespace-nowrap font-mono text-[12px] text-ink-muted">{c.id}</Td>
                      <Td className="whitespace-nowrap tabular-nums text-[12.5px] text-ink-muted">{c.executedAtLabel}</Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft">{c.executedBy}</Td>
                      <Td>
                        <MethodBadge method={c.method} />
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-[12.5px] text-ink">{c.invoiceNos.join("・")}</Td>
                      <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-ink">{yen(c.clearedAmount)}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums text-ink-muted">{c.feeAmount > 0 ? yen(c.feeAmount) : "—"}</Td>
                      <Td>
                        <ScoreBadge score={c.score} />
                      </Td>
                      <Td className="max-w-[320px]">
                        <span className="block truncate text-[12px] text-ink-muted" title={c.basis}>
                          {c.basis}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---- 仕訳データ（C-2） ---- */}
      {tab === "journal" && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-3.5">
            <span className="text-[13px] text-ink-muted">消込結果から自動生成（借方: 普通預金＋支払手数料 ／ 貸方: 売掛金＋仮受金）</span>
            <Button variant="secondary" size="sm" onClick={downloadJournalCsv} disabled={journals.length === 0}>
              <Icon name="download" className="h-4 w-4" /> CSVダウンロード
            </Button>
          </div>
          {journals.length === 0 ? (
            <EmptyState icon={<Icon name="fileText" className="h-10 w-10" />} title="仕訳データはまだありません" description="消込が実行されると仕訳が自動生成されます。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                    <Th>仕訳ID</Th>
                    <Th>日付</Th>
                    <Th>借方</Th>
                    <Th>貸方</Th>
                    <Th>摘要</Th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((j) => (
                    <tr key={j.id} className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                      <Td className="whitespace-nowrap font-mono text-[12px] text-ink-muted">{j.id}</Td>
                      <Td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDate(j.date)}</Td>
                      <Td>
                        {j.debits.map((l, i) => (
                          <div key={i} className="flex items-center justify-between gap-6 whitespace-nowrap">
                            <span className="text-[13px] text-ink-soft">{l.account}</span>
                            <span className="font-semibold tabular-nums text-ink">{yen(l.amount)}</span>
                          </div>
                        ))}
                      </Td>
                      <Td>
                        {j.credits.map((l, i) => (
                          <div key={i} className="flex items-center justify-between gap-6 whitespace-nowrap">
                            <span className="text-[13px] text-ink-soft">{l.account}</span>
                            <span className="font-semibold tabular-nums text-ink">{yen(l.amount)}</span>
                          </div>
                        ))}
                      </Td>
                      <Td className="max-w-[300px]">
                        <span className="block truncate text-[12px] text-ink-muted" title={j.memo}>
                          {j.memo}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---- 操作タイムライン（C-3） ---- */}
      {tab === "timeline" && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-surface-border px-5 py-3.5">
            <div className="relative min-w-[220px] flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="操作内容・ID で検索"
                className="h-10 w-full rounded-lg border border-surface-border bg-surface-input pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "ai", "staff", "manager", "system"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setActorFilter(a)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    actorFilter === a
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-ink-muted hover:text-ink"
                  }`}
                >
                  {a === "all" ? "すべて" : ACTOR_LABEL[a]}
                </button>
              ))}
            </div>
          </div>
          {timeline.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-faint">該当する操作履歴がありません</p>
          ) : (
            <ol className="relative px-5 py-4">
              {timeline.map((e, idx) => (
                <li key={e.id} className="relative flex gap-4 pb-5 last:pb-1">
                  {idx !== timeline.length - 1 && (
                    <span className="absolute left-[7px] top-5 h-full w-px bg-line-subtle" aria-hidden />
                  )}
                  <span className="relative z-10 mt-1.5 h-[15px] w-[15px] flex-none rounded-full border-2 border-surface bg-brand-400 shadow-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ActorBadge actor={e.actor} />
                      <span className="text-[11px] tabular-nums text-ink-faint">
                        {formatDate(e.demoDate)} {e.atLabel}
                      </span>
                      {e.refId && <span className="font-mono text-[11px] text-ink-faint">{e.refId}</span>}
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{e.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}
