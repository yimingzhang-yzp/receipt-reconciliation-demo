"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { SOURCE_SYSTEM } from "@/lib/data";
import type { AliasKind, Customer } from "@/lib/types";
import { Button, Card, HeroBanner, Td, Th } from "@/components/ui";
import { AliasKindBadge } from "@/components/badges";
import { Icon } from "@/components/icons";

// ------------------------------------------------------------
// 取引先マスタ（販売管理システムと同期。1顧客ID : N振込名義）
//   社名・カナ・代表者・支払条件などのマスタ本体は連携元が正のため編集不可。
//   本システムで管理するのは「振込名義」「経理窓口」「入金メモ」。
// ------------------------------------------------------------
export default function CustomersPage() {
  const customers = useDemoStore((s) => s.customers);
  const addPayerAlias = useDemoStore((s) => s.addPayerAlias);
  const removePayerAlias = useDemoStore((s) => s.removePayerAlias);
  const updateCustomerInfo = useDemoStore((s) => s.updateCustomerInfo);
  const pushToast = useDemoStore((s) => s.pushToast);

  const aliasTotal = useMemo(() => customers.reduce((sum, c) => sum + c.payerAliases.length, 0), [customers]);
  const learnedCount = useMemo(
    () => customers.reduce((sum, c) => sum + c.payerAliases.filter((a) => a.addedBy === "user").length, 0),
    [customers],
  );

  // 振込名義の追加フォーム
  const [formCustomerId, setFormCustomerId] = useState(customers[0]?.customerId ?? "");
  const [formAlias, setFormAlias] = useState("");
  const [formKind, setFormKind] = useState<AliasKind>("kana_alias");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter((c) =>
      `${c.customerId} ${c.name} ${c.kana} ${c.contactName} ${c.note ?? ""} ${c.payerAliases.map((a) => a.alias).join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [customers, search]);

  function addAlias() {
    if (!formAlias.trim() || !formCustomerId) return;
    addPayerAlias(formCustomerId, formAlias.trim(), formKind, "取引先マスタ画面から登録");
    pushToast("振込名義を登録しました。次回の突合から照合に使用されます", "success");
    setFormAlias("");
  }

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow="CUSTOMER MASTER"
        title="取引先マスタ"
        description={`${SOURCE_SYSTEM}と同期。社名・カナ・支払条件などのマスタ本体は連携元が正のため編集できません。振込名義（1顧客 : N名義）と経理窓口・入金メモを本システムで管理します。`}
        right={
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8FB0CC]">登録振込名義</div>
            <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-white">{aliasTotal}</div>
            <div className="mt-1.5 text-[12px] tabular-nums text-[#B7C7D8]">
              取引先 {customers.length}社 ・ 学習登録 {learnedCount}件
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm text-ink-soft">
        <Icon name="refresh" className="h-4 w-4 flex-none text-brand-500" />
        <span>
          <span className="font-semibold text-brand-700">{SOURCE_SYSTEM}と同期中</span>
          — 目検キューで名義を承認すると、振込名義レコードが自動で追加されます。経理窓口・メモは「編集」から更新できます。
        </span>
      </div>

      <Card padded={false} className="overflow-hidden">
        {/* 振込名義の追加フォーム */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line-subtle bg-surface-sunken/50 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">取引先</span>
            <select
              value={formCustomerId}
              onChange={(e) => setFormCustomerId(e.target.value)}
              className="h-10 w-64 rounded-lg border border-surface-border bg-surface-input px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerId}　{c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">振込名義（カナ）</span>
            <input
              value={formAlias}
              onChange={(e) => setFormAlias(e.target.value)}
              placeholder="例: カ)イトウチユウ"
              className="h-10 w-52 rounded-lg border border-surface-border bg-surface-input px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">種別</span>
            <select
              value={formKind}
              onChange={(e) => setFormKind(e.target.value as AliasKind)}
              className="h-10 w-36 rounded-lg border border-surface-border bg-surface-input px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option value="kana_alias">カナ別名</option>
              <option value="old_name">旧社名</option>
              <option value="personal">個人名義</option>
            </select>
          </label>
          <Button variant="primary" size="sm" onClick={addAlias} disabled={!formAlias.trim()}>
            <Icon name="plus" className="h-4 w-4" /> 振込名義を追加
          </Button>
          <div className="relative ml-auto min-w-[200px]">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="社名・名義・窓口で検索"
              className="h-10 w-full rounded-lg border border-surface-border bg-surface-input pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <Th>顧客ID</Th>
                <Th>正式名（連携元が正）</Th>
                <Th>支払条件</Th>
                <Th>経理窓口</Th>
                <Th>振込名義（1顧客 : N名義）</Th>
                <Th>入金メモ</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CustomerRow
                  key={c.customerId}
                  customer={c}
                  onRemoveAlias={(alias) => {
                    removePayerAlias(c.customerId, alias);
                    pushToast(`振込名義「${alias}」を削除しました`, "info");
                  }}
                  onSave={(patch) => updateCustomerInfo(c.customerId, patch)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-faint">
                    該当する取引先がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        ※ 正規名義（連携元マスタ由来）は削除できません。学習済み・個人名義など本システムで登録したレコードは緑背景で表示され、
        突合エンジンの名義照合に即時反映されます。経理窓口は督促メールの宛先にも使用されます。
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// 1取引先分の行（経理窓口・入金メモは行内編集できる）
// ------------------------------------------------------------
function CustomerRow({
  customer: c,
  onRemoveAlias,
  onSave,
}: {
  customer: Customer;
  onRemoveAlias: (alias: string) => void;
  onSave: (patch: { contactName: string; contactPhone: string; note: string | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [contactName, setContactName] = useState(c.contactName);
  const [contactPhone, setContactPhone] = useState(c.contactPhone);
  const [note, setNote] = useState(c.note ?? "");

  function startEdit() {
    setContactName(c.contactName);
    setContactPhone(c.contactPhone);
    setNote(c.note ?? "");
    setEditing(true);
  }

  function save() {
    onSave({ contactName: contactName.trim() || c.contactName, contactPhone: contactPhone.trim(), note: note.trim() || null });
    setEditing(false);
  }

  const inputCls =
    "h-8 w-full rounded-md border border-surface-border bg-surface-input px-2 text-[12.5px] text-ink outline-none focus:border-brand-500";

  return (
    <tr className="border-b border-line-subtle last:border-0 hover:bg-surface-sunken/60">
      <Td className="whitespace-nowrap align-top font-mono text-[13px] text-ink-soft">{c.customerId}</Td>
      <Td className="align-top">
        <span className="font-medium text-ink">{c.name}</span>
        <div className="mt-0.5 text-[11px] text-ink-muted">{c.kana}</div>
        {c.representativeKana && <div className="mt-0.5 text-[11px] text-ink-faint">代表: {c.representativeKana}</div>}
      </Td>
      <Td className="whitespace-nowrap align-top text-[12.5px] text-ink-soft">{c.paymentTerms}</Td>
      <Td className="align-top">
        {editing ? (
          <div className="w-40 space-y-1.5">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="担当者" className={inputCls} />
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="電話番号" className={inputCls} />
          </div>
        ) : (
          <>
            <div className="whitespace-nowrap text-[13px] text-ink">経理部 {c.contactName} 様</div>
            <div className="mt-0.5 whitespace-nowrap text-[11px] tabular-nums text-ink-muted">{c.contactPhone}</div>
          </>
        )}
      </Td>
      <Td className="align-top">
        <div className="flex max-w-[300px] flex-wrap items-center gap-1.5">
          {c.payerAliases.map((a) => (
            <span
              key={a.alias}
              title={a.note ?? undefined}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] ${
                a.addedBy === "user" ? "border-emerald-200 bg-emerald-50/60" : "border-line bg-surface"
              }`}
            >
              <span className="font-mono text-ink">{a.alias}</span>
              <AliasKindBadge kind={a.kind} />
              {a.kind !== "official" && (
                <button
                  onClick={() => onRemoveAlias(a.alias)}
                  className="text-ink-faint transition-colors hover:text-rose-600"
                  aria-label={`${a.alias} を削除`}
                >
                  <Icon name="x" className="h-3 w-3" strokeWidth={2.2} />
                </button>
              )}
            </span>
          ))}
        </div>
      </Td>
      <Td className="align-top">
        {editing ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="例: 合算入金が多い、相殺合意あり など"
            className="w-52 rounded-md border border-surface-border bg-surface-input px-2 py-1.5 text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-brand-500"
          />
        ) : c.note ? (
          <p className="max-w-[220px] text-[12px] leading-relaxed text-ink-soft">{c.note}</p>
        ) : (
          <span className="text-[12px] text-ink-faint">—</span>
        )}
      </Td>
      <Td className="whitespace-nowrap align-top">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Button variant="primary" size="sm" onClick={save}>
              保存
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              取消
            </Button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="rounded-md border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-sunken hover:text-ink"
          >
            編集
          </button>
        )}
      </Td>
    </tr>
  );
}
