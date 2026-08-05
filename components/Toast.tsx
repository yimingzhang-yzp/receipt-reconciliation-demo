"use client";

import { useEffect } from "react";
import { useDemoStore } from "@/lib/store";
import { Icon } from "@/components/icons";
import type { Toast } from "@/lib/types";

const TONE_STYLE: Record<Toast["tone"], { border: string; icon: "checkCircle" | "alertTriangle" | "sparkles"; iconCls: string }> = {
  success: { border: "border-emerald-200", icon: "checkCircle", iconCls: "text-emerald-500" },
  warn: { border: "border-amber-200", icon: "alertTriangle", iconCls: "text-amber-500" },
  info: { border: "border-brand-200", icon: "sparkles", iconCls: "text-brand-500" },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useDemoStore((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 4600);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);
  const s = TONE_STYLE[toast.tone];
  return (
    <div className={`animate-fade-in flex max-w-sm items-start gap-2.5 rounded-xl border ${s.border} bg-surface px-4 py-3 shadow-pop`}>
      <Icon name={s.icon} className={`mt-0.5 h-4 w-4 flex-none ${s.iconCls}`} strokeWidth={2} />
      <p className="flex-1 text-[13px] leading-relaxed text-ink-soft">{toast.message}</p>
      <button onClick={() => dismiss(toast.id)} className="text-ink-faint transition-colors hover:text-ink" aria-label="閉じる">
        <Icon name="x" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** 画面右下のトースト表示（D-3 辞書登録などの通知） */
export function ToastHost() {
  const toasts = useDemoStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
