// クイズモンスターの Service Worker。オフライン表示のためだけに使い、遊ぶ内容そのものは保存しない。
// 方針は docs/specs/02_basic-design/common/04_PWA詳細.md。

// 保存先の名前。中身の決め方を変えたときは、末尾の番号を上げて古い保存先を捨てさせる。
const CACHE_NAME = "qm-static-v1";
const OFFLINE_URL = "/offline.html";

// インストールのとき、オフライン用のページを保存し、待たずに新しい Service Worker へ切り替える。
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

// 有効になったとき、現在の名前以外の保存先を削除し、開いているページもすぐ管理下に置く。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 出題APIは触らない。保存すると古い問題が出てしまうため、常にネットワークへ。
  if (url.pathname.startsWith("/api/")) return;

  // ページの移動は、ネットワークを先に試し、失敗したときだけオフライン用のページを返す。
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // ファイル名にハッシュが付いて内容が変わらないものは、保存済みがあればそれを返し、無ければ取得して保存する。
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
  // 上記以外は触らない。
});
