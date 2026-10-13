import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import type { ReactNode } from "react";
import { BattleSessionProvider } from "@/modules/battle";
import { ServiceWorkerRegister } from "@/shared/ui/service-worker-register";
import "./globals.css";

// 画面全体の文字。太さは「普通」と「太字（font-medium）」の2種類だけ使う（DESIGN.md）。
// 日本語の文字は数が多く、先読みの対象にできないため preload は切る。
const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-jp",
});

// ブラウザのタブに出すタイトルと、検索結果などに出す説明文。
export const metadata: Metadata = {
  title: "クイズモンスター",
  description: "3択クイズに答えてモンスターをたおそう",
};

// すべての画面に共通する外枠。BattleSession（画面間で受け渡すメモリ）もここで持つ。
// 画面の文字は日本語なので、読み上げや自動翻訳のために lang="ja" を指定する。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className="font-sans">
        {/* 画面をまたいで、バトルの条件・結果・先読みした問題を受け渡す。 */}
        <BattleSessionProvider>{children}</BattleSessionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
