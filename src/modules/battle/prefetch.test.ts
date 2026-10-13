/**
 * 対象: battle/prefetch（createPrefetchStore）
 * 目的: 先読みの開始・取り出し・捨て方を担保する（設計書「BattleSessionと先読み」）
 *   - 条件が違う・失敗した先読みは取り出せず、取り出したら空になる
 *   - 同じ結果では2回始めない／捨てた先読みは使われない
 */
import { describe, it, expect, vi } from "vitest";
import type { FetchQuestionsResult } from "./api-client";
import { createPrefetchStore } from "./prefetch";
import type { BattleStart } from "./types";

const ok: FetchQuestionsResult = { ok: true, questions: [], unknownIds: [] };
const failed: FetchQuestionsResult = { ok: false, reason: "failed" };
const normal2: BattleStart = { mode: "normal", level: 2 };
const normal3: BattleStart = { mode: "normal", level: 3 };
const revenge: BattleStart = { mode: "revenge" };

/** 非同期の処理が一巡するまで待つ。 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** 返事を後から決められる fetcher の偽物を作る。 */
function deferred() {
  let resolve!: (result: FetchQuestionsResult) => void;
  const promise = new Promise<FetchQuestionsResult>((r) => (resolve = r));
  return { fetcher: vi.fn(() => promise), resolve };
}

describe("createPrefetchStore", () => {
  it("取得中の先読みは、同じ条件なら promise を取り出せて、その後は空になる", async () => {
    const { fetcher, resolve } = deferred();
    const store = createPrefetchStore(fetcher);
    store.begin(normal2, {});
    const taken = store.take(normal2);
    expect(taken).not.toBeNull();
    resolve(ok);
    await expect(taken).resolves.toEqual(ok);
    expect(store.take(normal2)).toBeNull();
  });

  it("条件（難易度・モード）が違うときは取り出せない", () => {
    const store = createPrefetchStore(async () => ok);
    store.begin(normal2, {});
    expect(store.take(normal3)).toBeNull();
    expect(store.take(revenge)).toBeNull();
    expect(store.take(normal2)).not.toBeNull();
  });

  it("リベンジ同士は同じ条件として取り出せる", () => {
    const store = createPrefetchStore(async () => ok);
    store.begin(revenge, {});
    expect(store.take(revenge)).not.toBeNull();
  });

  it("失敗が分かった先読みは取り出せない", async () => {
    const store = createPrefetchStore(async () => failed);
    store.begin(normal2, {});
    await flush();
    expect(store.take(normal2)).toBeNull();
  });

  it("想定外の例外も失敗として扱い、取り出せなくなる", async () => {
    const store = createPrefetchStore(async () => {
      throw new Error("boom");
    });
    store.begin(normal2, {});
    await flush();
    expect(store.take(normal2)).toBeNull();
  });

  it("同じ owner では2回始めない。別の owner なら始め直す", () => {
    const fetcher = vi.fn(async () => ok);
    const store = createPrefetchStore(fetcher);
    const owner = {};
    store.begin(normal2, owner);
    store.begin(normal2, owner);
    expect(fetcher).toHaveBeenCalledTimes(1);
    store.begin(normal2, {});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("捨てた先読みは取り出せず、後から返事が届いても次の先読みに影響しない", async () => {
    const first = deferred();
    const fetcher = vi
      .fn<(start: BattleStart) => Promise<FetchQuestionsResult>>()
      .mockImplementationOnce(first.fetcher)
      .mockResolvedValueOnce(ok);
    const store = createPrefetchStore(fetcher);
    store.begin(normal2, {});
    store.discard();
    expect(store.take(normal2)).toBeNull();

    // 新しい先読みを始めてから、捨てた方の失敗が届いても、新しい方は失敗扱いにならない。
    store.begin(normal2, {});
    first.resolve(failed);
    await flush();
    expect(store.take(normal2)).not.toBeNull();
  });
});
