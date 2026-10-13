/**
 * 対象: battle/api-client（fetchQuestions・toFetchError）
 * 目的: 出題API（POST /api/questions）の呼び出しと、応答・失敗の振り分けを担保する
 *   - 送る内容（通常/リベンジ、呼ぶ時点の保存データから wrongIds・recentIds を読む）
 *   - 成功／409（unknownIds つき）／それ以外の失敗の返し方、取り消しは投げ直すこと
 */
import { describe, it, expect, vi } from "vitest";
import type { Progress } from "@/modules/progress";
import type { Question } from "@/modules/quiz";
import { fetchQuestions, toFetchError } from "./api-client";

const progress: Progress = {
  version: 1,
  wrongIds: ["w1", "w2"],
  recentIds: { 1: ["r1"], 2: ["r2"], 3: ["r3"] },
  lastBossId: null,
  bossKills: {},
  perfectCount: 0,
  soundOn: true,
};

/** テスト用の問題を5問作る。 */
const questions = Array.from({ length: 5 }, (_, i): Question => ({
  id: `q${i}`,
  genre: "math",
  level: 2,
  question: "問題",
  choices: [
    { id: "c1", text: "A" },
    { id: "c2", text: "B" },
    { id: "c3", text: "C" },
  ],
  answer: "c2",
  explanation: "解説",
}));

/** 決まった応答を返す fetch の偽物を作る。 */
function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

const deps = (fetch: typeof globalThis.fetch) => ({ fetch, loadProgress: () => progress });

describe("battle/api-client fetchQuestions", () => {
  describe("リクエストを送るとき", () => {
    it("通常モードは mode・level・その難易度の recentIds・wrongIds を POST する", async () => {
      const fetch = fakeFetch(200, { questions, unknownIds: [] });
      await fetchQuestions({ mode: "normal", level: 2 }, deps(fetch));
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("/api/questions");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(init.body as string)).toEqual({
        mode: "normal",
        level: 2,
        recentIds: ["r2"],
        wrongIds: ["w1", "w2"],
      });
    });
    it("リベンジモードは mode と wrongIds だけを POST する", async () => {
      const fetch = fakeFetch(200, { questions, unknownIds: [] });
      await fetchQuestions({ mode: "revenge" }, deps(fetch));
      const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({ mode: "revenge", wrongIds: ["w1", "w2"] });
    });
    it("保存データは呼ぶ時点で読む（呼ぶたびに最新を送る）", async () => {
      const load = vi.fn(() => progress);
      const fetch = fakeFetch(200, { questions, unknownIds: [] });
      await fetchQuestions({ mode: "revenge" }, { fetch, loadProgress: load });
      await fetchQuestions({ mode: "revenge" }, { fetch, loadProgress: load });
      expect(load).toHaveBeenCalledTimes(2);
    });
    it("取り消し用の signal をそのまま fetch へ渡す", async () => {
      const fetch = fakeFetch(200, { questions, unknownIds: [] });
      const controller = new AbortController();
      await fetchQuestions({ mode: "revenge" }, { ...deps(fetch), signal: controller.signal });
      const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(init.signal).toBe(controller.signal);
    });
  });

  describe("成功したとき（200）", () => {
    it("5問と unknownIds を返す", async () => {
      const result = await fetchQuestions(
        { mode: "normal", level: 2 },
        deps(fakeFetch(200, { questions, unknownIds: ["x1"] })),
      );
      expect(result).toEqual({ ok: true, questions, unknownIds: ["x1"] });
    });
  });

  describe("リベンジできないとき（409 REVENGE_NOT_AVAILABLE）", () => {
    it("revengeUnavailable と unknownIds を返す", async () => {
      const body = { error: { code: "REVENGE_NOT_AVAILABLE", message: "…" }, unknownIds: ["w1"] };
      const result = await fetchQuestions({ mode: "revenge" }, deps(fakeFetch(409, body)));
      expect(result).toEqual({ ok: false, reason: "revengeUnavailable", unknownIds: ["w1"] });
    });
    it("unknownIds が壊れていても、空として revengeUnavailable を返す", async () => {
      const body = { error: { code: "REVENGE_NOT_AVAILABLE", message: "…" }, unknownIds: "x" };
      const result = await fetchQuestions({ mode: "revenge" }, deps(fakeFetch(409, body)));
      expect(result).toEqual({ ok: false, reason: "revengeUnavailable", unknownIds: [] });
    });
    it("409 でも code が違えば failed として扱う", async () => {
      const result = await fetchQuestions(
        { mode: "revenge" },
        deps(fakeFetch(409, { error: { code: "OTHER" } })),
      );
      expect(result).toEqual({ ok: false, reason: "failed" });
    });
  });

  describe("失敗したとき", () => {
    it("400・500 は failed を返す（投げない）", async () => {
      for (const status of [400, 500]) {
        const body = { error: { code: "X", message: "…" } };
        const result = await fetchQuestions(
          { mode: "normal", level: 1 },
          deps(fakeFetch(status, body)),
        );
        expect(result).toEqual({ ok: false, reason: "failed" });
      }
    });
    it("通信エラー（fetch が投げる）は failed を返す", async () => {
      const fetch = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      });
      const result = await fetchQuestions({ mode: "normal", level: 1 }, deps(fetch));
      expect(result).toEqual({ ok: false, reason: "failed" });
    });
    it("200 でも本文が JSON でない／5問でない／unknownIds が無いときは failed を返す", async () => {
      const notJson = vi.fn(async () => new Response("<html>", { status: 200 }));
      expect(await fetchQuestions({ mode: "revenge" }, deps(notJson))).toEqual({
        ok: false,
        reason: "failed",
      });
      const four = fakeFetch(200, { questions: questions.slice(0, 4), unknownIds: [] });
      expect(await fetchQuestions({ mode: "revenge" }, deps(four))).toEqual({
        ok: false,
        reason: "failed",
      });
      const noUnknown = fakeFetch(200, { questions });
      expect(await fetchQuestions({ mode: "revenge" }, deps(noUnknown))).toEqual({
        ok: false,
        reason: "failed",
      });
    });
  });

  describe("取り消されたとき（AbortError）", () => {
    it("failed にせず、そのまま投げ直す（呼んだ側が返事を捨てられるように）", async () => {
      const fetch = vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      });
      await expect(fetchQuestions({ mode: "revenge" }, deps(fetch))).rejects.toMatchObject({
        name: "AbortError",
      });
    });
  });
});

describe("battle/api-client toFetchError", () => {
  it("リベンジできない失敗は、オンライン／オフラインに関係なく revengeUnavailable", () => {
    const result: Parameters<typeof toFetchError>[0] = {
      ok: false,
      reason: "revengeUnavailable",
      unknownIds: [],
    };
    expect(toFetchError(result, true)).toBe("revengeUnavailable");
    expect(toFetchError(result, false)).toBe("revengeUnavailable");
  });
  it("それ以外の失敗は、オンラインなら failed、オフラインなら offline", () => {
    const result = { ok: false, reason: "failed" } as const;
    expect(toFetchError(result, true)).toBe("failed");
    expect(toFetchError(result, false)).toBe("offline");
  });
});
