// ------------------------------------------------------------
// 日付ユーティリティ（デモデータは今日を基準に相対生成する §5）
// ------------------------------------------------------------

export function todayIso(): string {
  return toIso(new Date());
}

export function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** iso + n日（nは負も可） */
export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** b - a の暦日数 */
export function diffDays(aIso: string, bIso: string): number {
  const ms = parse(bIso).getTime() - parse(aIso).getTime();
  return Math.round(ms / 86400000);
}

function isBusinessDay(d: Date): boolean {
  const w = d.getDay();
  return w !== 0 && w !== 6; // 土日以外（デモでは祝日は考慮しない）
}

/** iso + n営業日 */
export function addBusinessDays(iso: string, n: number): string {
  const d = parse(iso);
  let remain = n;
  while (remain > 0) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) remain--;
  }
  return toIso(d);
}

/** a→b の営業日数（a < b 前提。同日=0） */
export function businessDaysBetween(aIso: string, bIso: string): number {
  let [from, to] = [aIso, bIso];
  if (diffDays(aIso, bIso) < 0) [from, to] = [bIso, aIso];
  const d = parse(from);
  const end = parse(to).getTime();
  let count = 0;
  while (d.getTime() < end) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) count++;
  }
  return count;
}

/** 2026/08/05 形式 */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}`;
}

/** 08/05 形式 */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}

/** 実時刻の HH:mm:ss ラベル（監査ログ用） */
export function nowLabel(): string {
  try {
    return new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--:--";
  }
}
