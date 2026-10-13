/**
 * テストの目的（大項目）
 * 1. 言葉の一覧が、約100語そろっていること
 * 2. IDが「w-001」の形で、重複しないこと
 * 3. 言葉が重複せず、文字数と使ってよい文字の基準を守っていること
 */
import { describe, it, expect } from "vitest";
import { WORDS } from "./words";

/** 言葉の文字数の幅。小さい文字と「ー」も1文字と数える。 */
const MIN_LENGTH = 3;
const MAX_LENGTH = 6;

/**
 * 言葉に使ってよい文字。
 * 「を」「ぢ」「づ」「ゔ」と、小さい「ぁぃぅぇぉゎ」は使わない（設計書「言葉を選ぶ基準」）。
 */
const ALLOWED_CHARS = new Set(
  [
    // ふつうの文字
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん",
    // 濁点が付く文字
    "がぎぐげござじずぜぞだでどばびぶべぼ",
    // 半濁点が付く文字
    "ぱぴぷぺぽ",
    // 小さい文字と、のばす音
    "っゃゅょー",
  ].join(""),
);

/** 言葉の先頭に来てはいけない文字。前の文字が無いと読めないもの。 */
const NOT_AT_HEAD = new Set("っゃゅょーん");

describe("word/data WORDS", () => {
  describe("言葉の一覧を持つとき", () => {
    it("約100語（90〜110語）ある", () => {
      expect(WORDS.length).toBeGreaterThanOrEqual(90);
      expect(WORDS.length).toBeLessThanOrEqual(110);
    });
  });

  describe("IDを見たとき", () => {
    it("すべて「w-」と3けたの数字の形である", () => {
      const wrong = WORDS.filter((w) => !/^w-\d{3}$/.test(w.id)).map((w) => w.id);
      expect(wrong).toEqual([]);
    });
    it("重複しない", () => {
      expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    });
  });

  describe("言葉を見たとき", () => {
    it("重複しない", () => {
      expect(new Set(WORDS.map((w) => w.text)).size).toBe(WORDS.length);
    });
    it("すべて3〜6文字である", () => {
      const wrong = WORDS.filter(
        (w) => w.text.length < MIN_LENGTH || w.text.length > MAX_LENGTH,
      ).map((w) => w.text);
      expect(wrong).toEqual([]);
    });
    it("使ってよい文字だけでできている", () => {
      const wrong = WORDS.filter((w) => [...w.text].some((c) => !ALLOWED_CHARS.has(c))).map(
        (w) => w.text,
      );
      expect(wrong).toEqual([]);
    });
    it("小さい文字・「ー」・「ん」で始まらない", () => {
      const wrong = WORDS.filter((w) => NOT_AT_HEAD.has(w.text[0])).map((w) => w.text);
      expect(wrong).toEqual([]);
    });
  });
});
