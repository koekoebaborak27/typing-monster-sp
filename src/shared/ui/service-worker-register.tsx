"use client";

import { useEffect } from "react";

/**
 * Service Worker を登録する。画面には何も出さない。
 * 開発中は古い保存の影響で動きが分かりにくくなるため、本番ビルドのときだけ登録する。
 * 登録に失敗してもそのまま遊べるので、エラーは表示しない（Service Worker はオフライン表示のためだけに使う）。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
