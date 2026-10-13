/**
 * 対象: battle/battle-result（buildBattleResult）
 * 目的: 結果画面に出す値の組み立てを担保する（設計書「結果画面の表示」の「結果の作り方」）
 *   - 撃破回数は更新の前後を保存データから読む（初撃破は 0 → 1）
 *   - revengeCleared はリベンジで、更新後の「まちがえた問題」が5問未満のときだけ true
 */
import { describe, it, expect } from "vitest";
import type { Progress } from "@/modules/progress";
import { buildBattleResult } from "./battle-result";

const boss = { id: "b1", emoji: "👹", name: "ヒッカケオニ" };

/** テスト用の保存データを作る。 */
function progress(overrides: Partial<Progress> = {}): Progress {
  return {
    version: 1,
    wrongIds: [],
    recentIds: { 1: [], 2: [], 3: [] },
    lastBossId: null,
    bossKills: {},
    perfectCount: 0,
    soundOn: true,
    ...overrides,
  };
}

describe("buildBattleResult", () => {
  it("初めて倒したボスは killCountBefore が 0、after が 1 になる", () => {
    const result = buildBattleResult({
      start: { mode: "normal", level: 1 },
      boss,
      life: 3,
      reviewList: [],
      before: progress(),
      after: progress({ bossKills: { b1: 1 }, perfectCount: 1 }),
    });
    expect(result).toMatchObject({ killCountBefore: 0, killCountAfter: 1, perfectCount: 1 });
  });

  it("2回目以降は保存データの前後の値をそのまま使い、開始条件・ライフも持つ", () => {
    const start = { mode: "normal", level: 2 } as const;
    const result = buildBattleResult({
      start,
      boss,
      life: 1,
      reviewList: [],
      before: progress({ bossKills: { b1: 2 } }),
      after: progress({ bossKills: { b1: 3 } }),
    });
    expect(result).toMatchObject({ start, life: 1, killCountBefore: 2, killCountAfter: 3 });
  });

  it("通常モードは、まちがえた問題が少なくても revengeCleared が false", () => {
    const result = buildBattleResult({
      start: { mode: "normal", level: 1 },
      boss,
      life: 2,
      reviewList: [],
      before: progress(),
      after: progress({ bossKills: { b1: 1 } }),
    });
    expect(result.revengeCleared).toBe(false);
  });

  it.each([
    [5, false],
    [4, true],
    [0, true],
  ])("リベンジで更新後のまちがえた問題が %i問 なら revengeCleared は %s", (count, expected) => {
    const result = buildBattleResult({
      start: { mode: "revenge" },
      boss,
      life: 2,
      reviewList: [],
      before: progress(),
      after: progress({ wrongIds: Array.from({ length: count }, (_, i) => `w${i}`) }),
    });
    expect(result.revengeCleared).toBe(expected);
  });
});
