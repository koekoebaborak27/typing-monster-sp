/**
 * 対象: battle/next/scoring
 * 目的: ダメージの計算と、ミスの回数による評価の境目を担保する
 * （HPは100の倍数で 0 未満にならない、評価はミス 0→★3 / 1〜2→★2 / 3〜4→★1 / 5以上→★なし）
 */
import { describe, it, expect } from "vitest";
import { evaluate, hpAfterFinishFirstHit, hpAfterNormalHit, isPerfect } from "./scoring";

describe("hpAfterNormalHit", () => {
  it("100 減る", () => {
    expect(hpAfterNormalHit(500)).toBe(400);
    expect(hpAfterNormalHit(200)).toBe(100);
  });

  it("0 未満にはならない", () => {
    expect(hpAfterNormalHit(50)).toBe(0);
  });
});

describe("hpAfterFinishFirstHit", () => {
  it("残りHPの半分が残る", () => {
    expect(hpAfterFinishFirstHit(200)).toBe(100);
  });
});

describe("isPerfect", () => {
  it("ミス 0 回だけ true", () => {
    expect(isPerfect(0)).toBe(true);
    expect(isPerfect(1)).toBe(false);
  });
});

describe("evaluate", () => {
  it.each([
    [0, "perfect", 3],
    [1, "win", 2],
    [2, "win", 2],
    [3, "win", 1],
    [4, "win", 1],
    [5, "narrow", 0],
    [20, "narrow", 0],
  ] as const)("ミス %i 回は %s・★%i", (missCount, kind, stars) => {
    expect(evaluate(missCount)).toEqual({ kind, stars });
  });
});
