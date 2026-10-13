/**
 * テストの目的（大項目）
 * API の入口をくるむ withApi が、エラーを決まった応答に変えること。
 * 1. 正常終了したときは、ハンドラの応答をそのまま返すこと
 * 2. AppError は、その HTTP 番号・code・message で返し、409 では unknownIds も返すこと
 * 3. 想定外のエラーは、内容を隠して 500（INTERNAL_ERROR）で返すこと
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { AppError, Errors } from "@/shared/errors/app-error";
import { withApi } from "./with-api";

const request = new Request("http://localhost/api/test", { method: "POST" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withApi", () => {
  describe("ハンドラが正常に終わったとき", () => {
    it("ハンドラの応答をそのまま返す", async () => {
      const handler = withApi(async () => Response.json({ ok: true }, { status: 201 }));
      const response = await handler(request);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  describe("AppError が投げられたとき", () => {
    it("400 の AppError は、HTTP 番号・code・message をそのまま返す", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const handler = withApi(async () => {
        throw Errors.validation("level は 1〜3 で指定してください");
      });
      const response = await handler(request);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error: { code: "VALIDATION_ERROR", message: "level は 1〜3 で指定してください" },
      });
    });

    it("context に unknownIds（配列）があれば、応答に含める", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const handler = withApi(async () => {
        throw new AppError("REVENGE_NOT_AVAILABLE", 409, "足りません", {
          unknownIds: ["l1-math-99"],
        });
      });
      const response = await handler(request);
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: { code: "REVENGE_NOT_AVAILABLE", message: "足りません" },
        unknownIds: ["l1-math-99"],
      });
    });

    it("unknownIds が無ければ、応答に unknownIds を含めない", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const handler = withApi(async () => {
        throw Errors.validation("x", { other: 1 });
      });
      expect(await (await handler(request)).json()).not.toHaveProperty("unknownIds");
    });

    it("ログは1回だけ残す", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await withApi(async () => {
        throw Errors.validation("x");
      })(request);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe("想定外のエラーが投げられたとき", () => {
    it("内容を返さず、500（INTERNAL_ERROR）を返す", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler = withApi(async () => {
        throw new Error("内部の秘密の情報");
      });
      const response = await handler(request);
      expect(response.status).toBe(500);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const body = await response.json();
      expect(body).toEqual({
        error: { code: "INTERNAL_ERROR", message: "サーバーでエラーが起きました" },
      });
      expect(JSON.stringify(body)).not.toContain("秘密");
      expect(error).toHaveBeenCalledTimes(1);
    });
  });
});
