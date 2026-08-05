"use client";

import { useDemoStore } from "@/lib/store";
import { COMPANY } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/icons";
import type { Role } from "@/lib/types";

// ------------------------------------------------------------
// TopBar — デモ内日付とロール切替（担当者⇔上長 F-2。ヘッダーに配置）
// ------------------------------------------------------------
export function TopBar() {
  const role = useDemoStore((s) => s.role);
  const setRole = useDemoStore((s) => s.setRole);
  const demoDate = useDemoStore((s) => s.demoDate);
  const waiting = useDemoStore((s) => s.approvals.filter((a) => a.status === "waiting").length);

  const options: { key: Role; label: string; sub: string }[] = [
    { key: "staff", label: COMPANY.staffName, sub: COMPANY.staffLabel.split(" ")[0] },
    { key: "manager", label: COMPANY.managerName, sub: COMPANY.managerLabel.split(" ")[0] },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 backdrop-blur">
          <Icon name="calendar" className="h-3.5 w-3.5 text-ink-faint" />
          デモ内日付 <span className="font-semibold tabular-nums text-ink">{formatDate(demoDate)}</span>
        </span>
        <span className="hidden rounded-full border border-line bg-surface/70 px-3 py-1.5 backdrop-blur sm:inline-flex">
          銀行API・メール送信・会計連携はモック
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">ロール切替</span>
        <div className="flex rounded-full border border-line bg-surface/80 p-0.5 shadow-card backdrop-blur">
          {options.map((o) => {
            const active = role === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setRole(o.key)}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-150 ease-smooth ${
                  active ? "bg-brand-600 text-white shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon name={o.key === "manager" ? "userCheck" : "user"} className="h-3.5 w-3.5" />
                {o.sub} {o.label}
                {o.key === "manager" && waiting > 0 && (
                  <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${active ? "bg-white text-brand-700" : "bg-accent-500 text-white"}`}>
                    {waiting}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
