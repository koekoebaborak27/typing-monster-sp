/**
 * 対象: battle/next/battle-result（buildBattleResult）
 * 目的: 結果画面に出す値が、渡した値のまま揃うことを担保する（設計書「結果の作り方」）
 */
import { describe, it, expect } from "vitest";
import { buildBattleResult } from "./battle-result";

const boss = { id: "b1", emoji: "👹", name: "ミスタッチオニ" };

describe("buildBattleResult", () => {
  it("ボス・ミスの回数・撃破回数の前後・パーフェクトの回数を持つ", () => {
    const input = { boss, missCount: 2, killCountBefore: 0, killCountAfter: 1, perfectCount: 3 };
    expect(buildBattleResult(input)).toEqual(input);
  });
});
