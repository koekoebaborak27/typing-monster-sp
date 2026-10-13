/**
 * 対象: battle/scoring
 * 目的: ダメージ・ライフ・評価の計算と、出し直しの並べ替えの規則を担保する
 * （HPは100の倍数、ライフは0未満にならない、評価はライフ3→★3…0→★なし、出し直しで正解の位置が必ず変わる）
 */
import { describe, it, expect } from "vitest";
import type { ChoiceId } from "@/modules/quiz";
import {
  evaluate,
  hpAfterFinishFirstHit,
  hpAfterNormalHit,
  isPerfect,
  lifeAfterMiss,
  reorderForRetry,
} from "./scoring";

describe("battle/scoring hpAfterNormalHit", () => {
  it("通常問題の正解で100減る", () => {
    expect(hpAfterNormalHit(500)).toBe(400);
    expect(hpAfterNormalHit(200)).toBe(100);
  });
  it("0未満にはならない", () => {
    expect(hpAfterNormalHit(0)).toBe(0);
  });
});

describe("battle/scoring hpAfterFinishFirstHit", () => {
  it("残りHPの半分を減らす（通常問題の間違いが0〜3問の4通り）", () => {
    expect(hpAfterFinishFirstHit(200)).toBe(100);
    expect(hpAfterFinishFirstHit(300)).toBe(150);
    expect(hpAfterFinishFirstHit(400)).toBe(200);
    expect(hpAfterFinishFirstHit(500)).toBe(250);
  });
});

describe("battle/scoring lifeAfterMiss", () => {
  it("ライフを1つ減らす", () => {
    expect(lifeAfterMiss(3)).toBe(2);
    expect(lifeAfterMiss(1)).toBe(0);
  });
  it("0のときは0のまま（0未満にしない）", () => {
    expect(lifeAfterMiss(0)).toBe(0);
  });
});

describe("battle/scoring isPerfect", () => {
  it("ライフが3のときだけパーフェクトである", () => {
    expect(isPerfect(3)).toBe(true);
    expect(isPerfect(2)).toBe(false);
    expect(isPerfect(0)).toBe(false);
  });
});

describe("battle/scoring evaluate", () => {
  it("ライフ3はパーフェクト勝利（★3）", () => {
    expect(evaluate(3)).toEqual({ kind: "perfect", stars: 3 });
  });
  it("ライフ2は勝利（★2）", () => {
    expect(evaluate(2)).toEqual({ kind: "win", stars: 2 });
  });
  it("ライフ1は勝利（★1）", () => {
    expect(evaluate(1)).toEqual({ kind: "win", stars: 1 });
  });
  it("ライフ0はギリギリ勝利（★なし）", () => {
    expect(evaluate(0)).toEqual({ kind: "narrow", stars: 0 });
  });
});

describe("battle/scoring reorderForRetry", () => {
  const order: ChoiceId[] = ["c1", "c2", "c3"];

  /** 順番に決まった値を返す乱数の代わり。 */
  const sequence = (values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length];
  };

  it("正解の位置が前回と変わった並びを返す（どの正解・どの乱数でも）", () => {
    for (const answer of order) {
      for (let seed = 0; seed < 50; seed++) {
        let s = seed + 1;
        // 簡単な疑似乱数。値は毎回同じ順に出る。
        const random = () => (s = (s * 48271) % 2147483647) / 2147483647;
        const result = reorderForRetry(order, answer, random);
        expect(result.indexOf(answer)).not.toBe(order.indexOf(answer));
        expect([...result].sort()).toEqual(["c1", "c2", "c3"]);
      }
    }
  });
  it("最初の並べ替えで位置が同じなら、位置が変わるまで並べ替え直す", () => {
    // 0.99 を続けると並びが変わらない（各位置で自分自身と入れ替わる）。次に 0 を使うと先頭と入れ替わる。
    const result = reorderForRetry(order, "c1", sequence([0.99, 0.99, 0, 0.5]));
    expect(result.indexOf("c1")).not.toBe(0);
  });
  it("乱数がずっと同じ位置になる値でも、1つずらして必ず位置を変える", () => {
    const result = reorderForRetry(order, "c2", () => 0.99);
    expect(result).toEqual(["c2", "c3", "c1"]);
    expect(result.indexOf("c2")).not.toBe(order.indexOf("c2"));
  });
  it("元の並びは書き換えない", () => {
    const original: ChoiceId[] = ["c1", "c2", "c3"];
    reorderForRetry(original, "c1", () => 0);
    expect(original).toEqual(["c1", "c2", "c3"]);
  });
});
