/**
 * テストの目的（大項目）
 * 1. 最近出た言葉を除いた中から、重複しない5語を選ぶこと
 * 2. 選んだ順が出す順になり、同じ乱数なら同じ結果になること
 * 3. 候補が5語に満たないときは、足りない分だけ最近出た言葉から選ぶこと
 * 4. 一覧に無いIDは無視すること
 */
import { describe, it, expect } from "vitest";
import { WORDS } from "./data/words";
import { pickWords } from "./pick-words";

/** 乱数の代わりに、いつも同じ値を返す関数を作る。 */
const fixed = (value: number) => () => value;

/** 乱数の代わりに、渡した値を順に返す関数を作る。使い切ったら先頭へ戻る。 */
const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

/** 一覧の先頭から count 語のIDを返す。最近出た言葉として渡すために使う。 */
const headIds = (count: number) => WORDS.slice(0, count).map((w) => w.id);

const ids = (recentIds: readonly string[], random: () => number) =>
  pickWords(recentIds, random).map((w) => w.id);

describe("word/pick-words pickWords", () => {
  describe("最近出た言葉が無いとき", () => {
    it("5語を選ぶ", () => {
      expect(pickWords([], fixed(0.5))).toHaveLength(5);
    });
    it("乱数の最小値では、一覧の先頭から順に5語を選ぶ", () => {
      expect(ids([], fixed(0))).toEqual(headIds(5));
    });
    it("乱数の最大に近い値では、一覧の末尾から順に5語を選ぶ", () => {
      const tail = WORDS.slice(-5)
        .map((w) => w.id)
        .reverse();
      expect(ids([], fixed(0.999999))).toEqual(tail);
    });
    it("どの乱数でも、同じ言葉を2回選ばない", () => {
      for (let i = 0; i < 100; i++) {
        expect(new Set(ids([], fixed(i / 100))).size).toBe(5);
      }
    });
    it("同じ乱数なら、同じ5語を同じ順で返す", () => {
      const values = [0.12, 0.87, 0.5, 0.33, 0.99];
      expect(ids([], sequence(values))).toEqual(ids([], sequence(values)));
    });
    it("乱数で選んだ順が、そのまま出す順になる", () => {
      // 1語目は末尾、2語目は先頭、3語目は残り98語のまん中（50番目）を選ぶ乱数。
      const result = ids([], sequence([0.999999, 0, 0.5, 0, 0]));
      expect(result.slice(0, 3)).toEqual([WORDS[99].id, WORDS[0].id, WORDS[50].id]);
    });
  });

  describe("最近出た言葉が20語あるとき", () => {
    it("どの乱数でも、最近出た言葉を選ばない", () => {
      const recent = headIds(20);
      for (let i = 0; i < 100; i++) {
        const result = ids(recent, fixed(i / 100));
        expect(result.filter((id) => recent.includes(id))).toEqual([]);
      }
    });
    it("乱数の最小値では、最近出た言葉を除いた先頭から選ぶ", () => {
      expect(ids(headIds(20), fixed(0))[0]).toBe(WORDS[20].id);
    });
    it("残りの言葉はどれも選ばれうる", () => {
      const seen = new Set<string>();
      const restCount = WORDS.length - 20;
      for (let i = 0; i < restCount; i++) {
        seen.add(ids(headIds(20), fixed(i / restCount + 0.001))[0]);
      }
      expect(seen.size).toBe(restCount);
    });
  });

  describe("最近出た言葉に、一覧に無いIDがあるとき", () => {
    it("無視して、一覧のすべての言葉から選ぶ", () => {
      expect(ids(["w-999", "unknown"], fixed(0))).toEqual(headIds(5));
    });
  });

  describe("最近出ていない言葉がちょうど5語のとき", () => {
    it("その5語をすべて選ぶ", () => {
      const recent = headIds(WORDS.length - 5);
      const rest = WORDS.slice(-5).map((w) => w.id);
      expect(ids(recent, fixed(0))).toEqual(rest);
    });
  });

  describe("最近出ていない言葉が5語に満たないとき", () => {
    it("残りの言葉をすべて使い、足りない分を最近出た言葉から選ぶ", () => {
      const recent = headIds(WORDS.length - 2);
      const rest = WORDS.slice(-2).map((w) => w.id);
      const result = ids(recent, fixed(0));
      expect(result).toHaveLength(5);
      expect(result.slice(0, 2)).toEqual(rest);
      expect(result.slice(2)).toEqual(headIds(3));
    });
    it("同じ言葉を2回選ばない", () => {
      const recent = headIds(WORDS.length - 2);
      for (let i = 0; i < 100; i++) {
        expect(new Set(ids(recent, fixed(i / 100))).size).toBe(5);
      }
    });
  });

  describe("すべての言葉が最近出た言葉のとき", () => {
    it("最近出た言葉から5語を選ぶ", () => {
      const result = ids(headIds(WORDS.length), fixed(0.5));
      expect(new Set(result).size).toBe(5);
    });
  });
});
