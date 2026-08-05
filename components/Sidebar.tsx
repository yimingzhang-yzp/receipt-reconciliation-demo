"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/store";
import { fmtDuration } from "@/lib/format";
import { Icon, type IconName } from "@/components/icons";

const NAV: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "ダッシュボード", icon: "gauge", match: (p) => p === "/" },
  { href: "/import", label: "データ取込", icon: "inbox", match: (p) => p.startsWith("/import") },
  { href: "/matching", label: "突合結果", icon: "arrowLeftRight", match: (p) => p.startsWith("/matching") },
  { href: "/review", label: "目検キュー", icon: "eye", match: (p) => p.startsWith("/review") },
  { href: "/dunning", label: "督促管理", icon: "mailAlert", match: (p) => p.startsWith("/dunning") },
  { href: "/approval", label: "承認", icon: "userCheck", match: (p) => p.startsWith("/approval") },
  { href: "/audit", label: "消込ログ・監査", icon: "shield", match: (p) => p.startsWith("/audit") },
  { href: "/settings", label: "設定", icon: "sliders", match: (p) => p.startsWith("/settings") },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const reviewCount = useDemoStore(
    (s) => s.payments.filter((p) => p.status === "in_review" || p.status === "unapplied").length,
  );
  const approvalCount = useDemoStore((s) => s.approvals.filter((a) => a.status === "waiting").length);
  const dunningCount = useDemoStore((s) => s.dunning.filter((d) => d.status === "target" || d.status === "drafted").length);
  // 想定工数削減: 自動消込1件=20分、目検補助1件=10分（G-1）
  const savedMinutes = useDemoStore(
    (s) =>
      s.clearings.filter((c) => c.method === "auto").length * 20 +
      s.clearings.filter((c) => c.method !== "auto").length * 10,
  );

  const badgeFor = (href: string): number => {
    if (href === "/review") return reviewCount;
    if (href === "/approval") return approvalCount;
    if (href === "/dunning") return dunningCount;
    return 0;
  };

  return (
    <aside className="sidebar-bg fixed inset-y-0 left-0 flex w-[236px] flex-col border-r border-white/10 shadow-[6px_0_28px_-16px_rgba(6,20,36,0.8)]">
      {/* 上部シアングロー */}
      <span className="pointer-events-none absolute -left-10 top-0 h-40 w-56 opacity-50 blur-3xl" style={{ background: "radial-gradient(circle,rgba(0,175,236,0.4),transparent 70%)" }} aria-hidden />

      {/* ブランド (タイポ主体) */}
      <div className="relative px-5 pb-4 pt-5">
        <span className="mb-2 inline-flex items-center rounded-full border border-accent-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
          AI RECONCILIATION
        </span>
        <div className="text-[19px] font-bold tracking-tightish text-white">
          入金消込<span className="gradient-text">AI</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-400" />
          </span>
          <span className="text-[11px] font-medium text-accent-300">突合エンジン 稼働中</span>
        </div>
      </div>

      <nav className="relative flex-1 px-3 pt-1">
        <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Menu</div>
        {NAV.map((item) => {
          const active = item.match(pathname);
          const badge = badgeFor(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative mb-1 flex h-10 items-center gap-3 rounded-[10px] border px-3 text-sm transition-all duration-150 ease-smooth ${
                active
                  ? "border-accent-400/45 bg-accent-400/[0.15] text-white shadow-[0_0_18px_-4px_rgba(0,175,236,0.6)]"
                  : "border-white/[0.09] bg-white/[0.045] font-medium text-white/60 hover:-translate-y-px hover:bg-white/[0.08] hover:text-white/90"
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400" aria-hidden />}
              <Icon name={item.icon} className={`h-[18px] w-[18px] flex-none ${active ? "text-accent-300" : "text-white/45 group-hover:text-white/80"}`} />
              <span className="flex-1 truncate">{item.label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative space-y-2 p-3">
        {/* 削減時間ミニパネル */}
        <div className="rounded-[10px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">想定工数削減（今回）</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums text-white">{fmtDuration(savedMinutes)}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-white/35">手作業換算: 自動20分・目検10分/件</div>
        </div>
        <button
          onClick={() => {
            resetDemo();
            router.push("/");
          }}
          className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/85"
        >
          <Icon name="refresh" className="h-[15px] w-[15px]" /> デモをリセット
        </button>
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/75"
          >
            <Icon name="logout" className="h-[15px] w-[15px]" /> ログアウト
          </button>
        </form>
      </div>
    </aside>
  );
}
