/**
 * 対象: public/sw.js（Service Worker）
 * 目的: 設計書「PWAの詳細」の動作表どおりに動くことを担保する
 *   - /api/ と POST・他のオリジンは触らない
 *   - ページの移動は、通信に失敗したときだけ保存済みの /offline.html を返す
 *   - /_next/static/ と /icons/ は保存済みを優先し、無ければ取得して保存する
 *   - install で /offline.html を保存し、activate で古い保存先を消す
 */
import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";

type Handler = (event: unknown) => void;

/** sw.js を偽の実行環境（self・caches・fetch）で読み込み、登録されたイベントの処理を取り出す。 */
function loadServiceWorker() {
  const handlers: Record<string, Handler> = {};
  const store = new Map<string, Map<string, Response>>();
  const getCache = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };
  const caches = {
    open: async (name: string) => {
      const cache = getCache(name);
      return {
        add: async (url: string) => void cache.set(url, new Response("offline")),
        put: async (request: Request, response: Response) => void cache.set(request.url, response),
      };
    },
    match: async (key: string | Request) => {
      const url = typeof key === "string" ? key : key.url;
      for (const cache of store.values()) {
        for (const [saved, response] of cache) {
          if (saved === url || new URL(saved, "http://localhost").pathname === url) {
            return response;
          }
        }
      }
      return undefined;
    },
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
  };
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
  const self = {
    location: { origin: "http://localhost" },
    addEventListener: (type: string, handler: Handler) => (handlers[type] = handler),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
  };
  const source = readFileSync("public/sw.js", "utf8");
  new Function("self", "caches", "fetch", source)(self, caches, fetchMock);
  return { handlers, store, getCache, fetchMock, self };
}

/** fetch イベントを1回起こし、respondWith に渡された結果（無ければ null）を返す。 */
async function dispatchFetch(
  handler: Handler,
  url: string,
  init: { method?: string; mode?: string } = {},
): Promise<Response | undefined | null> {
  let responded: Promise<Response | undefined> | null = null;
  // Request の mode は書き換えられないので、sw.js が読む項目（method・url・mode）だけを持つ偽物にする。
  const request = { method: init.method ?? "GET", url, mode: init.mode ?? "cors" };
  handler({
    request,
    respondWith: (value: Promise<Response | undefined>) => (responded = value),
  });
  return responded ? await responded : null;
}

describe("public/sw.js", () => {
  it("install でオフライン用のページを保存し、すぐ切り替える", async () => {
    const { handlers, getCache, self } = loadServiceWorker();
    let waited: Promise<unknown> = Promise.resolve();
    handlers.install({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect(getCache("qm-static-v1").has("/offline.html")).toBe(true);
    expect(self.skipWaiting).toHaveBeenCalled();
  });

  it("activate で、現在の名前以外の保存先を削除する", async () => {
    const { handlers, store, getCache, self } = loadServiceWorker();
    getCache("qm-static-v1");
    getCache("old-cache");
    let waited: Promise<unknown> = Promise.resolve();
    handlers.activate({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect([...store.keys()]).toEqual(["qm-static-v1"]);
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it("/api/・POST・他のオリジンのリクエストは触らない", async () => {
    const { handlers, fetchMock } = loadServiceWorker();
    expect(await dispatchFetch(handlers.fetch, "http://localhost/api/questions")).toBeNull();
    expect(
      await dispatchFetch(handlers.fetch, "http://localhost/_next/static/a.js", { method: "POST" }),
    ).toBeNull();
    expect(await dispatchFetch(handlers.fetch, "http://example.com/_next/static/a.js")).toBeNull();
    expect(await dispatchFetch(handlers.fetch, "http://localhost/other.json")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ページの移動は、通信できればその結果を返す", async () => {
    const { handlers, fetchMock } = loadServiceWorker();
    fetchMock.mockResolvedValue(new Response("page"));
    const response = await dispatchFetch(handlers.fetch, "http://localhost/zukan", {
      mode: "navigate",
    });
    expect(await response?.text()).toBe("page");
  });

  it("ページの移動は、通信に失敗したら保存済みの /offline.html を返す", async () => {
    const { handlers, getCache, fetchMock } = loadServiceWorker();
    getCache("qm-static-v1").set("/offline.html", new Response("offline"));
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const response = await dispatchFetch(handlers.fetch, "http://localhost/", {
      mode: "navigate",
    });
    expect(await response?.text()).toBe("offline");
  });

  it("/_next/static/ は、無ければ取得して保存し、次からは保存済みを返す", async () => {
    const { handlers, getCache, fetchMock } = loadServiceWorker();
    fetchMock.mockImplementation(async () => new Response("js"));
    const url = "http://localhost/_next/static/chunk.js";

    const first = await dispatchFetch(handlers.fetch, url);
    expect(await first?.text()).toBe("js");
    expect(getCache("qm-static-v1").has(url)).toBe(true);

    const second = await dispatchFetch(handlers.fetch, url);
    expect(await second?.text()).toBe("js");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("取得に失敗した（200 以外の）応答は保存しない", async () => {
    const { handlers, getCache, fetchMock } = loadServiceWorker();
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
    await dispatchFetch(handlers.fetch, "http://localhost/icons/icon-192.png");
    expect(getCache("qm-static-v1").size).toBe(0);
  });
});
