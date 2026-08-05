"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { COMPANY } from "@/lib/data";
import { APPROVAL_TYPE_LABEL, formatDate, yen } from "@/lib/format";
import type { ApprovalRequest } from "@/lib/types";
import { Button, Card, EmptyState, HeroBanner, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icons";

const chip = "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium whitespace-nowrap";

function ApprovalStatusBadge({ status }: { status: ApprovalRequest["status"] }) {
  const map: Record<ApprovalRequest["status"], { cls: string; label: string }> = {
    waiting: { cls: "border-brand-200 bg-brand-50 text-brand-700", label: "承認待ち" },
    approved: { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "承認済み" },
    rejected: { cls: "border-rose-200 bg-rose-50 text-rose-700", label: "却下" },
    remanded: { cls: "border-orange-200 bg-orange-50 text-orange-700", label: "差戻し" },
  };
  const m = map[status];
  return <span className={`${chip} ${m.cls}`}>{m.label}</span>;
}

export default function ApprovalPage() {
  const role = useDemoStore((s) => s.role);
  const setRole = useDemoStore((s) => s.setRole);
  const approvals = useDemoStore((s) => s.approvals);
  const settings = useDemoStore((s) => s.settings);

  const waiting = useMemo(() => approvals.filter((a) => a.status === "waiting"), [approvals]);
  const decided = useMemo(() => [...approvals.filter((a) => a.status !== "waiting")].reverse(), [approvals]);

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="APPROVAL WORKFLOW"
        title="承認"
        description={`値引消込・不明入金の振替など、処理金額が ${yen(settings.approvalThreshold)} 以上の例外処理は上長承認が必要です（閾値は設定画面で変更可能）。`}
        right={
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">承認待ち</div>
            <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-white">{waiting.length}件</div>
            <div className="mt-1.5 text-[12px] tabular-nums text-[#B7C7D8]">
              合計 {yen(waiting.reduce((s, a) => s + a.amount, 0))}
            </div>
          </div>
        }
      />

      {/* ロール案内 */}
      {role === "staff" ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <Icon name="user" className="h-[18px] w-[18px]" />
          </span>
          <p className="flex-1 text-sm text-ink-soft">
            現在は <span className="font-semibold">{COMPANY.staffLabel}</span> のビューです。承認・却下を行うには、上長ロールに切り替えてください（画面右上でも切替できます）。
          </p>
          <Button variant="primary" size="sm" onClick={() => setRole("manager")}>
            <Icon name="userCheck" className="h-4 w-4" /> 上長ロールに切り替える
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm text-emerald-800">
          <Icon name="userCheck" className="h-4 w-4 flex-none" />
          <span>
            <span className="font-semibold">{COMPANY.managerLabel}</span> として承認操作が可能です。
          </span>
        </div>
      )}

      {/* 承認待ち一覧 */}
      <div>
        <SectionTitle sub="金額閾値を超えた例外処理（F-1）。承認すると消込・仕訳が実行されます">承認依頼</SectionTitle>
        {waiting.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Icon name="userCheck" className="h-10 w-10" />}
              title="承認待ちの依頼はありません"
              description="目検キューで高額の値引・振替処理を実行すると、承認依頼がここに届きます。"
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {waiting.map((a) => (
              <ApprovalCard key={a.id} req={a} canDecide={role === "manager"} />
            ))}
          </div>
        )}
      </div>

      {/* 承認履歴 */}
      {decided.length > 0 && (
        <div>
          <SectionTitle sub="承認・却下・差戻しの記録はすべて監査証跡に残ります（C-3）">承認履歴</SectionTitle>
          <Card padded={false}>
            <ul className="divide-y divide-line-subtle">
              {decided.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5">
                  <span className="font-mono text-[12px] text-ink-muted">{a.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{a.title}</span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{yen(a.amount)}</span>
                  <ApprovalStatusBadge status={a.status} />
                  {a.decisionComment && (
                    <span className="w-full pl-0 text-[12px] text-ink-muted sm:w-auto sm:pl-2">
                      コメント: {a.decisionComment}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// 承認カード（F-2: 承認 / 却下 / コメント付き差戻し）
// ------------------------------------------------------------
function ApprovalCard({ req, canDecide }: { req: ApprovalRequest; canDecide: boolean }) {
  const decideApproval = useDemoStore((s) => s.decideApproval);
  const [comment, setComment] = useState("");

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-subtle px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${chip} border-brand-200 bg-brand-50 text-brand-700`}>{APPROVAL_TYPE_LABEL[req.type]}</span>
            <span className="text-[15px] font-semibold text-ink">{req.title}</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{req.detail}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
            <span className="font-mono">{req.id}</span>
            <span>依頼者: {req.requestedBy}</span>
            <span>依頼日: {formatDate(req.requestedOnDemoDate)}</span>
            {req.paymentId && <span className="font-mono">入金: {req.paymentId}</span>}
            {req.invoiceNos.length > 0 && <span className="font-mono">請求: {req.invoiceNos.join("・")}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">処理金額</div>
          <div className="text-[22px] font-bold tabular-nums text-ink">{yen(req.amount)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 px-5 py-4">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={canDecide ? "コメント（差戻し時は必須推奨）" : "上長ロールで承認操作が可能になります"}
          disabled={!canDecide}
          className="h-10 min-w-[220px] flex-1 rounded-lg border border-surface-border bg-surface-input px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-brand-500 disabled:bg-surface-sunken"
        />
        <Button variant="success" size="sm" disabled={!canDecide} onClick={() => decideApproval(req.id, "approved", comment)}>
          <Icon name="checkCircle" className="h-4 w-4" /> 承認する
        </Button>
        <Button variant="secondary" size="sm" disabled={!canDecide} onClick={() => decideApproval(req.id, "remanded", comment)}>
          差戻し
        </Button>
        <Button variant="danger" size="sm" disabled={!canDecide} onClick={() => decideApproval(req.id, "rejected", comment)}>
          却下
        </Button>
      </div>
    </Card>
  );
}
