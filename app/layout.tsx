import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "入金消込AI Agent デモ",
  description:
    "請求データと銀行入金明細（FBデータ）をAIが突合し、自動消込・目検・督促・上長承認・監査証跡まで一気通貫で見せる営業デモ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
