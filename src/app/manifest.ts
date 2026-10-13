import type { MetadataRoute } from "next";

// ホーム画面に追加したときのアプリの情報（Next.js 標準の manifest）。
// 色は DESIGN.md の画面の背景色（globals.css の `--color-bg`）と同じ値。CSS の値はここから読めないので、同じ値を書いている。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "タイピングモンスター",
    short_name: "タイピングモンスター",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1b1b1b",
    theme_color: "#1b1b1b",
    // 端末が丸や角丸に切り抜くので、モンスターと題字は中央の約8割に収まる絵にしてある（まわりのひらがなは切れてもよい飾り）。
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
