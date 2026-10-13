/**
 * テストの目的（大項目）
 * 問題データ（questions.json）が、設計どおりの数と形になっていること。
 * 手作業で作ったデータなので、追加・修正のたびに壊れていないかをここで気づけるようにする。
 * （repository.ts は読み込み時に1問ずつ形を検証するので、読み込めた時点で形は正しい）
 */
import { describe, it, expect } from "vitest";
import { getQuestions } from "./repository";

describe("getQuestions（問題データ）", () => {
  const questions = getQuestions();

  describe("問題の数", () => {
    it("全部で240問ある", () => {
      expect(questions).toHaveLength(240);
    });

    it("3難易度 × 5教科 × 16問ずつある", () => {
      const counts = new Map<string, number>();
      for (const q of questions) {
        const key = `${q.level}-${q.genre}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect(counts.size).toBe(15);
      expect([...counts.values()].every((count) => count === 16)).toBe(true);
    });
  });

  describe("IDと内容", () => {
    it("問題IDに重複がない", () => {
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    });

    it("選択肢は3つで、IDは c1・c2・c3 の順になっている", () => {
      expect(questions.every((q) => q.choices.map((c) => c.id).join() === "c1,c2,c3")).toBe(true);
    });

    it("1問の中で選択肢の文言が重複していない", () => {
      expect(questions.every((q) => new Set(q.choices.map((c) => c.text)).size === 3)).toBe(true);
    });

    it("grade は読み込まない（画面で使わないため）", () => {
      expect(questions.some((q) => "grade" in q)).toBe(false);
    });
  });
});
