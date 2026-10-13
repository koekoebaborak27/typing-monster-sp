/**
 * テストの目的（大項目）
 * 1. 撃破回数から枠のランク（なし・銅・銀・金）を、境界値どおりに決めること
 * 2. 結果画面のお知らせ（新規登録・ランクアップ・表示なし）を、撃破回数の更新前の値から決めること
 */
import { describe, it, expect } from "vitest";
import { countDefeatedBosses, getRank, getZukanNotice } from "./rank";

describe("boss/rank getRank", () => {
  describe("撃破回数が0回のとき", () => {
    it("枠なし（null）になる", () => {
      expect(getRank(0)).toBeNull();
    });
  });
  describe("撃破回数が1〜2回のとき", () => {
    it.each([1, 2])("%i回は銅になる", (n) => {
      expect(getRank(n)).toBe("bronze");
    });
  });
  describe("撃破回数が3〜4回のとき", () => {
    it.each([3, 4])("%i回は銀になる", (n) => {
      expect(getRank(n)).toBe("silver");
    });
  });
  describe("撃破回数が5回以上のとき", () => {
    it.each([5, 6, 100])("%i回は金になる", (n) => {
      expect(getRank(n)).toBe("gold");
    });
  });
});

describe("boss/rank getZukanNotice", () => {
  describe("更新前の撃破回数が0回のとき", () => {
    it("新規登録（new）を返す", () => {
      expect(getZukanNotice(0)).toEqual({ kind: "new" });
    });
  });
  describe("更新後に枠が銅から銀に変わるとき", () => {
    it("更新前が2回なら、銀へのランクアップを返す", () => {
      expect(getZukanNotice(2)).toEqual({ kind: "rankUp", rank: "silver" });
    });
  });
  describe("更新後に枠が銀から金に変わるとき", () => {
    it("更新前が4回なら、金へのランクアップを返す", () => {
      expect(getZukanNotice(4)).toEqual({ kind: "rankUp", rank: "gold" });
    });
  });
  describe("更新しても枠が変わらないとき", () => {
    it.each([1, 3, 5, 6, 100])("更新前が%i回なら、何も出さない（null）", (n) => {
      expect(getZukanNotice(n)).toBeNull();
    });
  });
});

describe("boss/rank countDefeatedBosses", () => {
  const ids = ["a", "b", "c"];

  it("1回以上倒したボスだけを数える", () => {
    expect(countDefeatedBosses({ a: 1, b: 0, c: 5 }, ids)).toBe(2);
  });

  it("保存データに無いボスは未撃破として数えない", () => {
    expect(countDefeatedBosses({}, ids)).toBe(0);
  });

  it("ボス一覧に無いIDの記録は数に入れない", () => {
    expect(countDefeatedBosses({ a: 1, zzz: 9 }, ids)).toBe(1);
  });
});
