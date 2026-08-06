"use client";

import { useMemo } from "react";
import { useDemoStore } from "@/lib/store";
import { diffDays } from "@/lib/dates";
import { customerNameOf, formatDate, yen } from "@/lib/format";
import type { DunningCase, DunningStatus, Invoice } from "@/lib/types";
import { Button, Card, EmptyState, HeroBanner, LinkButton } from "@/components/ui";
import { AgingBadge, DunningStatusBadge } from "@/components/badges";
import { Icon } from "@/components/icons";

export default function DunningPage() {
  const invoices = useDemoStore((s) => s.invoices);
  const dunning = useDemoStore((s) => s.dunning);
  const demoDate = useDemoStore((s) => s.demoDate);
  const matchingDone = useDemoStore((s) => s.matchingDone);
  const advanceDemoDays = useDemoStore((s) => s.advanceDemoDays);

  const rows = useMemo(
    () =>
      dunning
        .map((d) => ({ d, inv: invoices.find((i) => i.invoiceNo === d.invoiceNo) }))
        .filter((x): x is { d: DunningCase; inv: Invoice } => !!x.inv)
        .sort((a, b) => diffDays(b.inv.dueDate, demoDate) - diffDays(a.inv.dueDate, demoDate)),
    [dunning, invoices, demoDate],
  );

  const totalAmount = rows.reduce((s, r) => s + r.inv.amount, 0);
  const sentCount = rows.filter((r) => ["sent", "opened", "no_reaction"].includes(r.d.status)).length;
  const repliedCount = rows.filter((r) => r.d.status === "replied").length;

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="DUNNING MANAGEMENT"
        title="督促管理"
        description="期日超過・未入金の債権に対して、AIが督促メールを自動作成します。送信後は開封・返信の対応状況をトレースし、無反応が続くと再督促・エスカレーションを提示します。"
        right={
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">未回収金額</div>
            <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-white">{yen(totalAmount)}</div>
            <div className="mt-1.5 text-[12px] tabular-nums text-[#B7C7D8]">
              対象 {rows.length}件 ・ 督促済 {sentCount}件 ・ 返信 {repliedCount}件
            </div>
          </div>
        }
      />

      {/* 基準日コントロール（E-2 の経過日数確認用） */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/80 px-5 py-3.5 backdrop-blur">
        <Icon name="clock" className="h-4 w-4 text-ink-muted" />
        <span className="text-[13px] text-ink-soft">
          基準日: <span className="font-semibold tabular-nums text-ink">{formatDate(demoDate)}</span>
        </span>
        <span className="text-[12px] text-ink-muted">日付を進めると、無反応7日で「再督促」、14日で「エスカレーション」のバッジが表示されます</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => advanceDemoDays(1)}>
            ⏩ 1日進める
          </Button>
          <Button variant="secondary" size="sm" onClick={() => advanceDemoDays(7)}>
            ⏩ 7日進める
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon name="mailAlert" className="h-10 w-10" />}
            title={matchingDone ? "督促対象はありません" : "まだ突合が実行されていません"}
            description={
              matchingDone
                ? "期日超過の未入金債権はすべて解消されています。"
                : "「突合結果」で自動突合を実行すると、期日超過・未入金の債権がここに抽出されます。"
            }
            action={
              !matchingDone ? (
                <LinkButton href="/matching" variant="primary">
                  突合結果へ <Icon name="chevronRight" className="h-4 w-4" />
                </LinkButton>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {rows.map(({ d, inv }) => (
            <DunningCard key={d.invoiceNo} d={d} inv={inv} demoDate={demoDate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// 1案件分のカード（メール生成・編集・送信・トレース E-1/E-2）
// ------------------------------------------------------------
function DunningCard({ d, inv, demoDate }: { d: DunningCase; inv: Invoice; demoDate: string }) {
  const customers = useDemoStore((s) => s.customers);
  const customerName = customerNameOf(customers, inv.customerId);
  const generateDunningMail = useDemoStore((s) => s.generateDunningMail);
  const updateDunningDraft = useDemoStore((s) => s.updateDunningDraft);
  const sendDunningMail = useDemoStore((s) => s.sendDunningMail);
  const setDunningTrace = useDemoStore((s) => s.setDunningTrace);
  const sendReminder = useDemoStore((s) => s.sendReminder);

  const overdue = diffDays(inv.dueDate, demoDate);
  const sinceSent = d.sentOnDemoDate ? diffDays(d.sentOnDemoDate, demoDate) : 0;
  const noReply = ["sent", "opened", "no_reaction"].includes(d.status);
  const escalation = noReply && sinceSent >= 14;
  const reDunning = noReply && sinceSent >= 7 && !escalation;

  return (
    <Card padded={false} className="overflow-hidden">
      {/* ヘッダー行 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-subtle px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{customerName}</span>
            <span className="font-mono text-[12px] text-ink-muted">{inv.invoiceNo}</span>
            {d.remindCount > 0 && (
              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700">
                再督促 {d.remindCount}回
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
            <span>
              期日 <span className="tabular-nums">{formatDate(inv.dueDate)}</span>
            </span>
            <AgingBadge overdueDays={overdue} />
            <span>担当営業: {inv.staffName || "未設定"}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[19px] font-bold tabular-nums text-ink">{yen(inv.amount)}</div>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <DunningStatusBadge status={d.status} />
            {escalation && (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[12px] font-semibold text-rose-700">
                <Icon name="alertTriangle" className="h-3.5 w-3.5" strokeWidth={2} /> エスカレーション
              </span>
            )}
            {reDunning && (
              <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[12px] font-semibold text-orange-700">
                再督促推奨
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 本体 */}
      <div className="px-5 py-4">
        {d.status === "target" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-ink-muted">
              督促メールが未作成です。テンプレート＋案件情報（請求番号・金額・期日）からAIが文面を自動生成します。
            </p>
            <Button variant="ai" size="sm" onClick={() => generateDunningMail(inv.invoiceNo)}>
              <Icon name="sparkles" className="h-4 w-4" /> AIで督促メールを作成
            </Button>
          </div>
        )}

        {d.status === "drafted" && d.draft && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink-muted">
              <Icon name="mailAlert" className="h-3.5 w-3.5" /> メールプレビュー（編集可・実送信はしません）
            </div>
            <div className="rounded-xl border border-line bg-surface-sunken/60 p-4">
              <div className="grid gap-2.5">
                <label className="flex items-center gap-2 text-[13px]">
                  <span className="w-12 flex-none text-ink-muted">宛先</span>
                  <input
                    value={d.draft.to}
                    onChange={(e) => updateDunningDraft(inv.invoiceNo, { to: e.target.value })}
                    className="h-9 flex-1 rounded-lg border border-surface-border bg-surface-input px-3 text-[13px] text-ink outline-none focus:border-brand-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <span className="w-12 flex-none text-ink-muted">件名</span>
                  <input
                    value={d.draft.subject}
                    onChange={(e) => updateDunningDraft(inv.invoiceNo, { subject: e.target.value })}
                    className="h-9 flex-1 rounded-lg border border-surface-border bg-surface-input px-3 text-[13px] text-ink outline-none focus:border-brand-500"
                  />
                </label>
                <textarea
                  value={d.draft.body}
                  onChange={(e) => updateDunningDraft(inv.invoiceNo, { body: e.target.value })}
                  rows={10}
                  className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => generateDunningMail(inv.invoiceNo)}>
                <Icon name="refresh" className="h-3.5 w-3.5" /> 文面を再生成
              </Button>
              <Button variant="primary" size="sm" onClick={() => sendDunningMail(inv.invoiceNo)}>
                <Icon name="send" className="h-4 w-4" /> 送信する
              </Button>
            </div>
          </div>
        )}

        {(noReply || d.status === "replied") && (
          <div className="space-y-3">
            {/* トレースステッパー */}
            <div className="flex flex-wrap items-center gap-2">
              <TraceStep label="送信" done />
              <TraceArrow />
              <TraceStep label="開封" done={["opened", "replied", "no_reaction"].includes(d.status)} />
              <TraceArrow />
              <TraceStep label="返信" done={d.status === "replied"} failed={d.status === "no_reaction"} />
              <span className="ml-2 text-[12px] tabular-nums text-ink-muted">
                {d.sentOnDemoDate ? `送信 ${formatDate(d.sentOnDemoDate)}（${sinceSent}日経過）` : ""}
              </span>
            </div>

            {d.draft && (
              <details className="rounded-lg border border-line bg-surface-sunken/50 px-4 py-2.5 text-[12.5px] text-ink-muted">
                <summary className="cursor-pointer select-none font-medium text-ink-soft">送信済みメールを表示</summary>
                <div className="mt-2 whitespace-pre-wrap font-mono leading-relaxed">{d.draft.body}</div>
              </details>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-3">
              {/* E-2: 対応状況の手動更新 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">状況を更新:</span>
                {(
                  [
                    ["opened", "開封にする"],
                    ["replied", "返信ありにする"],
                    ["no_reaction", "無反応にする"],
                  ] as [DunningStatus, string][]
                ).map(([st, label]) => (
                  <button
                    key={st}
                    onClick={() => setDunningTrace(inv.invoiceNo, st)}
                    disabled={d.status === st}
                    className="rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(reDunning || escalation) && d.status !== "replied" && (
                <Button variant={escalation ? "danger" : "primary"} size="sm" onClick={() => sendReminder(inv.invoiceNo)}>
                  <Icon name="send" className="h-3.5 w-3.5" /> 再督促メールを送信
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function TraceStep({ label, done, failed }: { label: string; done?: boolean; failed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12.5px] font-medium ${
        failed
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-line bg-surface-sunken text-ink-faint"
      }`}
    >
      {failed ? (
        <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2.2} />
      ) : done ? (
        <Icon name="checkCircle" className="h-3.5 w-3.5" strokeWidth={2.2} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
      )}
      {label}
    </span>
  );
}

function TraceArrow() {
  return <Icon name="chevronRight" className="h-3.5 w-3.5 text-ink-faint" />;
}
