import { NextRequest, NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

// ログインなしで通すパス（ログイン画面と認証APIのみ）。
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  if (await verifyToken(token)) return NextResponse.next();

  // 未認証: APIは401、ページは /login へ（戻り先を next で保持）
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// 静的アセット以外すべてにミドルウェアを適用（APIルートも含む）。
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
