"use client";

import { useState } from "react";
import { useDemoStore } from "@/lib/store";
import { yen } from "@/lib/format";
import { SOURCE_SYSTEM } from "@/lib/data";
import { Button, Card, HeroBanner, LinkButton, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icons";

const FEE_OPTIONS = [110, 220, 330, 440, 660, 880];
const THRESHOLD_PRESETS = [50000, 100000, 300000, 500000];

export default function SettingsPage() {
  const settings = useDemoStore((s) => s.settings);
  const customers = useDemoStore((s) => s.customers);
  const setApprovalThreshold = useDemoStore((s) => s.setApprovalThreshold);
  const toggleFeeTolerance = useDemoStore((s) => s.toggleFeeTolerance);

  const [thresholdInput, setThresholdInput] = useState(String(settings.approvalThreshold));
  const aliasTotal = customers.reduce((sum, c) => sum + c.payerAliases.length, 0);

  function saveThreshold() {
    const v = Number(thresholdInput.replace(/[^\d]/g, ""));
    if (!Number.isFinite(v) || v <= 0) return;
    setApprovalThreshold(v);
  }

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="SETTINGS"
        title="設定"
        description="承認金額の閾値・振込手数料の許容値を管理します。変更はすべて監査証跡に記録されます。振込名義の管理は取引先マスタで行います。"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 承認閾値（F-1） */}
        <Card>
          <SectionTitle sub="値引消込・不明入金の振替などの処理金額がこの値以上の場合、上長承認が必要になります">
            上長承認の金額閾値
          </SectionTitle>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">¥</span>
              <input
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                inputMode="numeric"
                className="h-11 w-44 rounded-lg border border-surface-border bg-surface-input pl-7 pr-3 text-right text-[15px] font-semibold tabular-nums text-ink outline-none focus:border-brand-500"
              />
            </div>
            <Button variant="primary" onClick={saveThreshold}>
              保存
            </Button>
            <span className="text-[13px] text-ink-muted">
              現在: <span className="font-semibold tabular-nums text-ink">{yen(settings.approvalThreshold)}</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {THRESHOLD_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setThresholdInput(String(v))}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium tabular-nums transition-colors ${
                  settings.approvalThreshold === v
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-line bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                {yen(v)}
              </button>
            ))}
          </div>
        </Card>

        {/* 手数料許容値（B-2） */}
        <Card>
          <SectionTitle sub="請求額との差がこの金額と一致する場合、振込手数料相当として自動消込します（手数料控除の仕訳を生成）">
            振込手数料の許容値
          </SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            {FEE_OPTIONS.map((v) => {
              const on = settings.feeTolerances.includes(v);
              return (
                <button
                  key={v}
                  onClick={() => toggleFeeTolerance(v)}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-medium tabular-nums transition-all ${
                    on
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-line bg-surface text-ink-faint hover:text-ink-muted"
                  }`}
                >
                  {on ? <Icon name="checkCircle" className="h-3.5 w-3.5" strokeWidth={2.2} /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />}
                  {v}円
                </button>
              );
            })}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px] text-ink-muted">
              <span>
                自動消込スコア: <span className="font-semibold tabular-nums text-ink">{settings.autoThreshold} 以上</span>
              </span>
              <span>
                要目検スコア: <span className="font-semibold tabular-nums text-ink">{settings.reviewMin}〜{settings.autoThreshold - 1}</span>
              </span>
              <span className="text-ink-faint">※ スコア閾値はシステム標準値（変更不可）</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 振込名義の管理は取引先マスタへ */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="book" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-ink">振込名義の管理は「取引先マスタ」へ</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
              名義ゆれ・旧社名・個人名義・学習済み名義は、{SOURCE_SYSTEM}と同期する取引先マスタ上で
              1顧客ID : N振込名義のレコードとして管理します（現在 {customers.length}社・{aliasTotal}名義）。
            </p>
          </div>
          <LinkButton href="/customers" variant="primary" size="sm">
            取引先マスタを開く <Icon name="chevronRight" className="h-4 w-4" />
          </LinkButton>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        ※ 設定の変更は即時に突合エンジンへ反映されます。「初期状態に戻す」で標準設定に戻ります。
      </p>
    </div>
  );
}
