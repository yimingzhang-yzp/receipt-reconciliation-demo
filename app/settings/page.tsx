"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { yen } from "@/lib/format";
import type { DictKind } from "@/lib/types";
import { Button, Card, HeroBanner, SectionTitle, Td, Th } from "@/components/ui";
import { DictKindBadge } from "@/components/badges";
import { Icon } from "@/components/icons";

const FEE_OPTIONS = [110, 220, 330, 440, 660, 880];
const THRESHOLD_PRESETS = [50000, 100000, 300000, 500000];

export default function SettingsPage() {
  const settings = useDemoStore((s) => s.settings);
  const dict = useDemoStore((s) => s.dict);
  const invoices = useDemoStore((s) => s.invoices);
  const setApprovalThreshold = useDemoStore((s) => s.setApprovalThreshold);
  const toggleFeeTolerance = useDemoStore((s) => s.toggleFeeTolerance);
  const addDictEntry = useDemoStore((s) => s.addDictEntry);
  const removeDictEntry = useDemoStore((s) => s.removeDictEntry);

  const [thresholdInput, setThresholdInput] = useState(String(settings.approvalThreshold));

  // 辞書追加フォーム
  const customers = useMemo(() => Array.from(new Set(invoices.map((i) => i.customerName))), [invoices]);
  const [dictFrom, setDictFrom] = useState("");
  const [dictTo, setDictTo] = useState(customers[0] ?? "");
  const [dictKind, setDictKind] = useState<DictKind>("kana_alias");

  function saveThreshold() {
    const v = Number(thresholdInput.replace(/[^\d]/g, ""));
    if (!Number.isFinite(v) || v <= 0) return;
    setApprovalThreshold(v);
  }

  function addDict() {
    if (!dictFrom.trim() || !dictTo) return;
    addDictEntry(dictFrom.trim(), dictTo, dictKind, "設定画面から登録");
    setDictFrom("");
  }

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="SETTINGS"
        title="設定"
        description="承認金額の閾値・振込手数料の許容値・名義ゆれ辞書を管理します。変更はすべて監査証跡に記録されます。"
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
              <span className="text-ink-faint">※ スコア閾値はデモでは固定です</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 名義ゆれ辞書（A-3 / D-3） */}
      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-surface-border px-5 pb-3 pt-5">
          <SectionTitle sub="カナ名義・旧社名・代表者個人名義と正式取引先名の対応表。目検キューでの承認時にも自動登録されます（D-3）">
            名義ゆれ辞書（{dict.length}件）
          </SectionTitle>
        </div>

        {/* 追加フォーム */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line-subtle bg-surface-sunken/50 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">振込名義（カナ）</span>
            <input
              value={dictFrom}
              onChange={(e) => setDictFrom(e.target.value)}
              placeholder="例: カ)アルフア"
              className="h-10 w-56 rounded-lg border border-surface-border bg-surface-input px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">正式取引先名</span>
            <select
              value={dictTo}
              onChange={(e) => setDictTo(e.target.value)}
              className="h-10 w-64 rounded-lg border border-surface-border bg-surface-input px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              {customers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">種別</span>
            <select
              value={dictKind}
              onChange={(e) => setDictKind(e.target.value as DictKind)}
              className="h-10 w-40 rounded-lg border border-surface-border bg-surface-input px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option value="kana_alias">カナ別名</option>
              <option value="old_name">旧社名</option>
              <option value="personal">個人名義</option>
            </select>
          </label>
          <Button variant="primary" size="sm" onClick={addDict} disabled={!dictFrom.trim()}>
            <Icon name="plus" className="h-4 w-4" /> 追加
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <Th>振込名義（正規化後）</Th>
                <Th />
                <Th>正式取引先名</Th>
                <Th>種別</Th>
                <Th>登録元</Th>
                <Th>メモ</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {dict.map((e) => (
                <tr key={e.id} className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken">
                  <Td className="whitespace-nowrap font-mono text-[13px] text-ink">{e.from}</Td>
                  <Td>
                    <Icon name="chevronRight" className="h-3.5 w-3.5 text-ink-faint" />
                  </Td>
                  <Td className="whitespace-nowrap font-medium text-ink">{e.to}</Td>
                  <Td>
                    <DictKindBadge kind={e.kind} />
                  </Td>
                  <Td className="whitespace-nowrap text-[12.5px] text-ink-muted">{e.addedBy === "seed" ? "初期データ" : "ユーザー登録"}</Td>
                  <Td className="max-w-[240px]">
                    <span className="block truncate text-[12px] text-ink-muted" title={e.note ?? ""}>
                      {e.note ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <button
                      onClick={() => removeDictEntry(e.id)}
                      className="rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-ink-muted transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    >
                      削除
                    </button>
                  </Td>
                </tr>
              ))}
              {dict.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                    辞書エントリがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        ※ 本画面の設定はデモ用のメモリ内状態です。「デモをリセット」で初期値に戻ります。本番では管理画面・権限管理付きのマスタ設定に置き換わります。
      </p>
    </div>
  );
}
