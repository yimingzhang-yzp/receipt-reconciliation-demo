import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-[13px] border border-surface-border bg-surface shadow-card ${padded ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  sub,
  right,
}: {
  children: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[19px] font-semibold tracking-tightish text-ink">{children}</h2>
        {sub ? <p className="mt-1 text-[13px] text-ink-muted">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

// ------------------------------------------------------------
// Button — グラデは "ai" バリアント限定
// ------------------------------------------------------------
type ButtonVariant = "ai" | "primary" | "success" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  ai: "ai-gradient text-white border-transparent shadow-glow-sm hover:shadow-glow hover:-translate-y-px",
  primary: "bg-brand-600 text-white border-transparent hover:bg-brand-500",
  success: "bg-emerald-600 text-white border-transparent hover:bg-emerald-500",
  secondary: "bg-surface text-ink-soft border-line hover:border-line-strong hover:bg-surface-sunken",
  ghost: "bg-transparent text-ink-soft border-transparent hover:bg-surface-sunken hover:text-ink",
  danger: "bg-transparent text-rose-600 border-rose-300 hover:bg-rose-50",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-[13px]",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-6 text-[15px]",
};

const BTN_BASE =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[9px] border font-medium transition-all duration-150 ease-smooth disabled:cursor-not-allowed disabled:opacity-40";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  disabled,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${BTN_BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "secondary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BTN_BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------
// PageHeader — 通常はライトのページヘッダー
// ------------------------------------------------------------
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "戻る",
  meta,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-1.5 inline-flex items-center gap-1 text-[13px] text-ink-muted transition-colors hover:text-brand-600"
          >
            <span aria-hidden>←</span> {backLabel}
          </Link>
        ) : null}
        <h1 className="text-[27px] font-bold leading-tight tracking-tightish text-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{description}</p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2.5">{actions}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------
// HeroBanner — 主要ページのダーク・ネオン ヒーロー
// ------------------------------------------------------------
export function HeroBanner({
  eyebrow,
  title,
  description,
  actions,
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="hero-navy relative overflow-hidden rounded-2xl border border-white/10 px-7 py-7 shadow-navy sm:px-9">
      {/* 上部アクセントライン */}
      <span className="accent-line pointer-events-none absolute inset-x-0 top-0 h-[3px]" aria-hidden />
      {/* 右上シアングロー */}
      <span
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(0,175,236,0.5) 0%, rgba(0,175,236,0) 70%)" }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          {eyebrow ? (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent-400/40 bg-accent-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-accent-300">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="neon-cyan text-[28px] font-bold leading-tight tracking-tightish text-white">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#B7C7D8]">{description}</p>
          ) : null}
          {actions ? <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
        {right ? <div className="flex-none">{right}</div> : null}
      </div>
    </div>
  );
}

/** ラベル + 値の行 */
export function Field({
  label,
  children,
  missing,
}: {
  label: string;
  children: ReactNode;
  missing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className={`text-sm ${missing ? "text-orange-600" : "text-ink"}`}>{children}</span>
    </div>
  );
}

export function Empty() {
  return <span className="text-ink-faint">—</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 py-14 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <div className="text-[15px] font-medium text-ink-soft">{title}</div>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action}
    </div>
  );
}

// ---- テーブル小物 ----

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-3.5 ${className}`}>{children}</th>;
}

export function Td({ children, className = "", title }: { children?: ReactNode; className?: string; title?: string }) {
  return (
    <td className={`px-4 py-3.5 align-middle ${className}`} title={title}>
      {children}
    </td>
  );
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}
