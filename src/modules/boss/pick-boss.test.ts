/**
 * テストの目的（大項目）
 * 1. 直前のボス以外の19体から、等しい確率で選ぶこと
 * 2. 直前のボスが無い（null）か、一覧に無いIDのときは、20体から選ぶこと
 * 3. ボス一覧がIDの重複なく20体そろっていること
 */
import { describe, it, expect } from "vitest";
import { BOSSES } from "./data/bosses";
import { pickBoss } from "./pick-boss";

/** 乱数の代わりに、決まった値を返す関数を作る。 */
const fixed = (value: number) => () => value;

describe("boss/data BOSSES", () => {
  describe("ボス一覧を持つとき", () => {
    it("20体あり、IDが重複しない", () => {
      expect(BOSSES).toHaveLength(20);
      expect(new Set(BOSSES.map((b) => b.id)).size).toBe(20);
    });
    it("先頭と末尾が設計書の順どおりである", () => {
      expect(BOSSES[0].id).toBe("ukkari-tako");
      expect(BOSSES[19].id).toBe("iiwake-wani");
    });
  });
});

describe("boss/pick-boss pickBoss", () => {
  describe("直前のボスがあるとき", () => {
    it("直前のボスを候補から除き、19体の中から選ぶ", () => {
      const results = new Set<string>();
      for (let i = 0; i < 19; i++) {
        results.add(pickBoss("hikkake-oni", fixed(i / 19 + 0.001)).id);
      }
      expect(results.size).toBe(19);
      expect(results.has("hikkake-oni")).toBe(false);
    });
    it("乱数の最小値では、直前のボスを除いた先頭を選ぶ", () => {
      expect(pickBoss("ukkari-tako", fixed(0)).id).toBe("hikkake-oni");
    });
    it("乱数の最大に近い値では、直前のボスを除いた末尾を選ぶ", () => {
      expect(pickBoss("iiwake-wani", fixed(0.999999)).id).toBe("hatena-invader");
      expect(pickBoss("ukkari-tako", fixed(0.999999)).id).toBe("iiwake-wani");
    });
    it("どの乱数でも直前のボスは選ばれない", () => {
      for (let i = 0; i < 100; i++) {
        expect(pickBoss("nebosuke-guma", fixed(i / 100)).id).not.toBe("nebosuke-guma");
      }
    });
  });

  describe("直前のボスが無いとき（null）", () => {
    it("20体の中から選べる（先頭も末尾も選ばれうる）", () => {
      expect(pickBoss(null, fixed(0)).id).toBe("ukkari-tako");
      expect(pickBoss(null, fixed(0.999999)).id).toBe("iiwake-wani");
    });
  });

  describe("直前のボスIDが一覧に無いとき", () => {
    it("null と同じに扱い、20体の中から選べる", () => {
      expect(pickBoss("unknown-boss", fixed(0)).id).toBe("ukkari-tako");
      expect(pickBoss("unknown-boss", fixed(0.999999)).id).toBe("iiwake-wani");
    });
  });
});
