"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDemoStore } from "@/lib/store";
import { formatDate, yen } from "@/lib/format";
import type { MatchCandidate, Payment } from "@/lib/types";
import { Button, Card, EmptyState, Field, HeroBanner, LinkButton, SectionTitle } from "@/components/ui";
import { AgentAvatar, MatchTypeBadge, PaymentStatusBadge, ScoreBadge } from "@/components/badges";
import { Icon } from "@/components/icons";

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewInner />
    </Suspense>
  );
}

function ReviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoices = useDemoStore((s) => s.invoices);
  const payments = useDemoStore((s) => s.payments);
  const results = useDemoStore((s) => s.results);
  const settings = useDemoStore((s) => s.settings);
  const matchingDone = useDemoStore((s) => s.matchingDone);
  const approveReview = useDemoStore((s) => s.approveReview);
  const chooseAlternate = useDemoStore((s) => s.chooseAlternate);
  const remandReview = useDemoStore((s) => s.remandReview);
  const resolveOverpay = useDemoStore((s) => s.resolveOverpay);
  const resolveSuspense = useDemoStore((s) => s.resolveSuspense);

  // 目検キュー: 要目検 + 保留（不明入金の処理もここで行う D-1）
  const queue = useMemo(
    () => payments.filter((p) => p.status === "in_review" || p.status === "unapplied"),
    [payments],
  );

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [registerDict, setRegisterDict] = useState(true);

  // 選択中の案件が処理されてキューから消えたら、次の案件へ
  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.some((p) => p.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);

  const selected = queue.find((p) => p.id === selectedId) ?? null;
  const result = selected ? results[selected.id] : null;
  const best = result?.best ?? null;

  const invoiceOf = (no: string) => invoices.find((i) => i.invoiceNo === no);

  if (!matchingDone) {
    return (
      <div className="space-y-8">
        <Hero count={0} />
        <Card>
          <EmptyState
            icon={<Icon name="eye" className="h-10 w-10" />}
            title="まだ突合が実行されていません"
            description="「突合結果」で自動突合を実行すると、人の確認が必要な案件がここに並びます。"
            action={
              <LinkButton href="/matching" variant="primary">
                突合結果へ <Icon name="chevronRight" className="h-4 w-4" />
              </LinkButton>
            }
          />
        </Card>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="space-y-8">
        <Hero count={0} />
        <Card>
          <EmptyState
            icon={<Icon name="checkCircle" className="h-10 w-10" />}
            title="目検キューは空です"
            description="要目検・保留の案件はすべて処理済みです。お疲れさまでした。"
            action={
              <LinkButton href="/" variant="primary">
                ダッシュボードで成果を確認 <Icon name="chevronRight" className="h-4 w-4" />
              </LinkButton>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Hero count={queue.length} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ---- キュー一覧 ---- */}
        <div className="space-y-2.5 lg:sticky lg:top-6 lg:self-start">
          {queue.map((p) => {
            const r = results[p.id];
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all duration-150 ease-smooth ${
                  active
                    ? "border-brand-300 bg-brand-50/70 shadow-card"
                    : "border-surface-border bg-surface hover:-translate-y-px hover:shadow-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[13px] font-medium text-ink">{p.payerNameRaw}</span>
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{yen(p.amount)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {r?.best ? (
                    <>
                      <MatchTypeBadge type={r.best.matchType} />
                      <ScoreBadge score={r.best.score} />
                    </>
                  ) : (
                    <PaymentStatusBadge status={p.status} />
                  )}
                  {r?.remandComment && (
                    <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">
                      差戻しあり
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ---- 詳細（左右比較 + 判断理由 D-1/D-2） ---- */}
        {selected && (
          <div className="min-w-0 space-y-5">
            {result?.remandComment && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <Icon name="alertTriangle" className="mt-0.5 h-4 w-4 flex-none text-rose-500" strokeWidth={2} />
                <div className="text-[13px] text-rose-700">
                  <span className="font-semibold">上長からの差戻し:</span> {result.remandComment}
                </div>
              </div>
            )}

            {/* AI判断理由 */}
            <div className="ai-border rounded-2xl">
              <div className="rounded-[15px] bg-surface p-5">
                <div className="flex items-start gap-3.5">
                  <AgentAvatar size="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-ink">AIの判断理由</h2>
                      {best && <MatchTypeBadge type={best.matchType} />}
                      {best && <ScoreBadge score={best.score} />}
                      {best && best.nameSimilarity < 1 && (
                        <span className="text-[12px] tabular-nums text-ink-muted">名義類似度 {Math.round(best.nameSimilarity * 100)}%</span>
                      )}
                    </div>
                    <ul className="mt-3 space-y-2">
                      {(best?.reasons ?? ["債権台帳のどの請求とも名義・金額が一致しませんでした。", "過入金・別部門宛・翌月請求分の前払いなどの可能性があります。"]).map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-soft">
                          <Icon name="chevronRight" className="mt-1 h-3.5 w-3.5 flex-none text-accent-500" strokeWidth={2.4} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 左右比較 */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* 請求情報 */}
              <Card padded={false}>
                <div className="border-b border-surface-border bg-surface-sunken px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                  請求情報（債権台帳）
                </div>
                <div className="space-y-4 p-5">
                  {best ? (
                    <>
                      {best.invoiceNos.map((no) => {
                        const inv = invoiceOf(no);
                        if (!inv) return null;
                        return (
                          <div key={no} className="rounded-lg border border-line p-4">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[13px] text-ink-soft">{inv.invoiceNo}</span>
                              <span className="text-[15px] font-bold tabular-nums text-ink">{yen(inv.amount)}</span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
                              <Field label="取引先">{inv.customerName}</Field>
                              <Field label="カナ">{inv.customerKana}</Field>
                              <Field label="支払期日">{formatDate(inv.dueDate)}</Field>
                              <Field label="担当営業">{inv.staffName || "未設定"}</Field>
                            </div>
                          </div>
                        );
                      })}
                      {best.invoiceNos.length > 1 && (
                        <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-4 py-2.5 text-sm">
                          <span className="font-medium text-ink-soft">請求合計（{best.invoiceNos.length}件）</span>
                          <span className="font-bold tabular-nums text-ink">
                            {yen(best.invoiceNos.reduce((s, no) => s + (invoiceOf(no)?.amount ?? 0), 0))}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-ink-faint">紐付く請求候補がありません</p>
                  )}
                </div>
              </Card>

              {/* 入金情報 */}
              <Card padded={false}>
                <div className="border-b border-surface-border bg-surface-sunken px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                  入金情報（銀行明細）
                </div>
                <div className="p-5">
                  <div className="rounded-lg border border-line p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[13px] text-ink-soft">{selected.id}</span>
                      <span className="text-[15px] font-bold tabular-nums text-ink">{yen(selected.amount)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <Field label="振込名義（原文）">{selected.payerNameRaw}</Field>
                      <Field label="正規化後">{best?.normalizedPayer ?? "—"}</Field>
                      <Field label="入金日">{formatDate(selected.paymentDate)}</Field>
                      <Field label="取扱銀行">{selected.bankName}</Field>
                    </div>
                  </div>

                  {best && best.amountDiff !== 0 && (
                    <div
                      className={`mt-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                        best.feeAssumed
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : best.amountDiff > 0
                            ? "border-brand-200 bg-brand-50 text-brand-700"
                            : "border-orange-200 bg-orange-50 text-orange-700"
                      }`}
                    >
                      <span className="font-medium">
                        {best.feeAssumed ? "金額差（振込手数料相当）" : best.amountDiff > 0 ? "過入金差額" : "不足額"}
                      </span>
                      <span className="font-bold tabular-nums">{yen(Math.abs(best.amountDiff))}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* 別候補（D-1: 別候補選択） */}
            {result && result.alternates.length > 0 && (
              <Card padded={false}>
                <div className="border-b border-surface-border px-5 pb-3 pt-4">
                  <SectionTitle sub="AIが検討した他の紐付け候補。選択すると比較対象を切り替えます">別候補</SectionTitle>
                </div>
                <ul className="divide-y divide-line-subtle">
                  {result.alternates.map((alt, idx) => (
                    <AlternateRow key={idx} alt={alt} onSelect={() => chooseAlternate(selected.id, idx)} invoiceName={invoiceOf(alt.invoiceNos[0])?.customerName ?? ""} />
                  ))}
                </ul>
              </Card>
            )}

            {/* アクション */}
            <Card>
              <ActionPanel
                payment={selected}
                best={best}
                approvalThreshold={settings.approvalThreshold}
                registerDict={registerDict}
                setRegisterDict={setRegisterDict}
                onApprove={() => approveReview(selected.id, registerDict)}
                onRemand={() => remandReview(selected.id)}
                onOverpay={() => resolveOverpay(selected.id)}
                onSuspense={() => resolveSuspense(selected.id)}
                overpayToApproval={
                  best?.matchType === "overpayment" &&
                  selected.amount - (invoiceOf(best.invoiceNos[0])?.amount ?? 0) >= settings.approvalThreshold
                }
                suspenseToApproval={selected.amount >= settings.approvalThreshold}
                onDone={() => router.push("/review")}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Hero({ count }: { count: number }) {
  return (
    <HeroBanner
      eyebrow="HUMAN IN THE LOOP"
      title="目検キュー"
      description="AIの判断根拠を確認し、承認・差戻し・別候補選択を行います。名義ゆれを辞書登録すると、次回から自動一致になります。"
      right={
        <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">要対応</div>
          <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-white">{count}件</div>
        </div>
      }
    />
  );
}

function AlternateRow({ alt, onSelect, invoiceName }: { alt: MatchCandidate; onSelect: () => void; invoiceName: string }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] text-ink">{alt.invoiceNos.join("・")}</span>
          <span className="text-[13px] text-ink-soft">{invoiceName}</span>
          <MatchTypeBadge type={alt.matchType} />
          <ScoreBadge score={alt.score} />
        </div>
        <p className="mt-1 truncate text-[12px] text-ink-muted" title={alt.reasons.join(" / ")}>
          {alt.reasons[0]}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onSelect}>
        この候補にする
      </Button>
    </li>
  );
}

function ActionPanel({
  payment,
  best,
  approvalThreshold,
  registerDict,
  setRegisterDict,
  onApprove,
  onRemand,
  onOverpay,
  onSuspense,
  overpayToApproval,
  suspenseToApproval,
  onDone,
}: {
  payment: Payment;
  best: MatchCandidate | null;
  approvalThreshold: number;
  registerDict: boolean;
  setRegisterDict: (v: boolean) => void;
  onApprove: () => void;
  onRemand: () => void;
  onOverpay: () => void;
  onSuspense: () => void;
  overpayToApproval: boolean;
  suspenseToApproval: boolean;
  onDone: () => void;
}) {
  const dictEligible = best && ["name_fuzzy", "old_name", "personal", "combined"].includes(best.matchType);

  // 保留（不明入金）の処理
  if (payment.status === "unapplied") {
    return (
      <div className="space-y-4">
        <SectionTitle sub="紐付く請求がないため、経理判断での処理が必要です">この入金の処理</SectionTitle>
        {suspenseToApproval && (
          <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-700">
            処理金額 {yen(payment.amount)} は承認閾値（{yen(approvalThreshold)}）以上のため、実行すると上長承認へ回付されます（F-1）。
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="primary" onClick={() => { onSuspense(); onDone(); }}>
            <Icon name="userCheck" className="h-4 w-4" /> 仮受金として計上する
          </Button>
          <span className="text-[12px] text-ink-muted">判断がつくまで保留のままにすることもできます</span>
        </div>
      </div>
    );
  }

  // 過入金の処理（差額振替 → 閾値以上は上長承認 F-1）
  if (best?.matchType === "overpayment") {
    return (
      <div className="space-y-4">
        <SectionTitle sub="請求額分を消込み、過入金差額を仮受金へ振替します">この入金の処理</SectionTitle>
        {overpayToApproval && (
          <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-700">
            振替額 {yen(best.amountDiff)} は承認閾値（{yen(approvalThreshold)}）以上のため、実行すると上長承認へ回付されます（F-1）。
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="primary" onClick={() => { onOverpay(); onDone(); }}>
            <Icon name="arrowLeftRight" className="h-4 w-4" /> 差額を仮受金へ振替して消込
          </Button>
          <Button variant="danger" onClick={() => { onRemand(); onDone(); }}>
            差戻し（保留へ）
          </Button>
        </div>
      </div>
    );
  }

  // 通常の目検承認
  return (
    <div className="space-y-4">
      <SectionTitle sub="内容に問題がなければ承認して消込を確定します">この案件の処理</SectionTitle>
      {dictEligible && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-[13.5px] text-ink-soft transition-colors hover:border-line-strong">
          <input
            type="checkbox"
            checked={registerDict}
            onChange={(e) => setRegisterDict(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            この名義ゆれを辞書に登録する
            <span className="block text-[12px] text-ink-muted">
              「{payment.payerNameRaw}」→ 候補請求先。次回の突合から自動一致になります（D-3）
            </span>
          </span>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="success" onClick={() => { onApprove(); onDone(); }}>
          <Icon name="checkCircle" className="h-4 w-4" /> 承認して消込
        </Button>
        <Button variant="danger" onClick={() => { onRemand(); onDone(); }}>
          差戻し（保留へ）
        </Button>
      </div>
    </div>
  );
}
