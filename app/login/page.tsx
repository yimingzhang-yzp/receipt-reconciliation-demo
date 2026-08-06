import { safeNext } from "@/lib/auth";
import { Icon } from "@/components/icons";

export const metadata = { title: "ログイン｜入金消込AI" };

// 共有パスワードのログイン画面（サーバーコンポーネント・素のフォーム）。
export default function LoginPage({ searchParams }: { searchParams: { e?: string; next?: string } }) {
  const next = safeNext(searchParams.next);
  const action = "/api/auth/login" + (next !== "/" ? "?next=" + encodeURIComponent(next) : "");
  const err =
    searchParams.e === "config"
      ? "サーバー設定が未完了です。管理者に連絡してください。"
      : searchParams.e
        ? "パスワードが違います。"
        : null;

  return (
    <div className="hero-cobalt relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* 背景のグラデーションオーブ */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent-500/20 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="ai-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-glow-cyan animate-glow-pulse">
            <Icon name="sparkles" className="h-7 w-7" strokeWidth={2} />
          </div>
          <div>
            <div className="neon-cyan text-xl font-bold tracking-tightish text-white">
              入金消込<span className="gradient-text">AI</span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium tracking-wide text-[#8397AB]">Receipt Reconciliation Agent</div>
          </div>
        </div>

        <form className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl" method="post" action={action}>
          <span className="accent-line pointer-events-none absolute inset-x-0 top-0 h-[3px]" aria-hidden />
          <h1 className="text-base font-semibold text-white">ログイン</h1>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            本システムは関係者限定です。共有パスワードを入力してください。
          </p>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs text-red-200">{err}</div>
          ) : null}

          <div className="mt-4">
            <label htmlFor="password" className="text-[11px] font-medium text-white/50">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <button
            type="submit"
            className="ai-gradient mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-glow transition-all hover:brightness-110"
          >
            ログイン
          </button>
        </form>

      </div>
    </div>
  );
}
