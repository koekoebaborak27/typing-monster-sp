/**
 * 対象: battle/next/view
 * 目的: バトル画面・結果画面の表示の出し分けのうち、状態から決まる部分を担保する（設計書「表示の出し分け」）
 */
import { describe, it, expect } from "vitest";
import type { BattleResult } from "./battle-result";
import {
  getEvaluationView,
  getFinishLabel,
  getHintText,
  getMissNote,
  getNoticeTexts,
  hpPercent,
  isAngry,
  progressPercent,
  splitTarget,
} from "./view";

describe("isAngry", () => {
  it("ミス 4 回までは通常、5 回から怒りモード", () => {
    expect(isAngry(4)).toBe(false);
    expect(isAngry(5)).toBe(true);
  });
});

describe("hpPercent", () => {
  it("HP 500 で100%、200 で40%、0 で0%", () => {
    expect(hpPercent(500)).toBe(100);
    expect(hpPercent(200)).toBe(40);
    expect(hpPercent(0)).toBe(0);
  });

  it("範囲外のHPは 0〜100 に収める", () => {
    expect(hpPercent(-10)).toBe(0);
    expect(hpPercent(600)).toBe(100);
  });
});

describe("progressPercent", () => {
  it("入力待ちは slot / 5", () => {
    expect(progressPercent("typing", 0)).toBe(0);
    expect(progressPercent("typing", 3)).toBe(60);
  });

  it("ダメージ表示・とどめの一撃は (slot + 1) / 5", () => {
    expect(progressPercent("damage", 0)).toBe(20);
    expect(progressPercent("finishing", 4)).toBe(100);
  });
});

describe("getFinishLabel", () => {
  it("1〜3問目は出さない", () => {
    expect(getFinishLabel("typing", 2)).toBeNull();
  });

  it("4・5問目は 1/2・2/2 を出す", () => {
    expect(getFinishLabel("typing", 3)).toBe("とどめ問題 1/2");
    expect(getFinishLabel("damage", 3)).toBe("とどめ問題 1/2");
    expect(getFinishLabel("typing", 4)).toBe("とどめ問題 2/2");
  });

  it("とどめの一撃の状態では出さない", () => {
    expect(getFinishLabel("finishing", 4)).toBeNull();
  });
});

describe("splitTarget", () => {
  it("入力待ちは、打てた文字・次の1文字・残りに分ける", () => {
    expect(splitTarget("ねこです", "typing", 2)).toEqual({ typed: "ねこ", next: "で", rest: "す" });
    expect(splitTarget("ねこ", "typing", 0)).toEqual({ typed: "", next: "ね", rest: "こ" });
  });

  it("ダメージ表示・とどめの一撃は全部を打てた文字にする", () => {
    expect(splitTarget("ねこ", "damage", 2)).toEqual({ typed: "ねこ", next: "", rest: "" });
    expect(splitTarget("ねこ", "finishing", 2)).toEqual({ typed: "ねこ", next: "", rest: "" });
  });
});

describe("getHintText", () => {
  it("合っているときは出さない", () => {
    expect(getHintText("", false)).toBeNull();
  });

  it("違う文字が残っているときは、その1文字目を示す", () => {
    expect(getHintText("けこ", false)).toBe("「け」は ちがうよ。⌫ で けしてね");
  });

  it("日本語入力がオフと見なしたときは、その案内を出す", () => {
    expect(getHintText("neko", true)).toBe("にほんご入力を オンにしてね");
  });
});

describe("getEvaluationView", () => {
  it.each([
    [0, "パーフェクト勝利！", 3],
    [1, "勝利！", 2],
    [2, "勝利！", 2],
    [3, "勝利！", 1],
    [4, "勝利！", 1],
    [5, "ギリギリ勝利！", null],
  ] as const)("ミス %i 回は「%s」・★%s", (missCount, title, stars) => {
    expect(getEvaluationView(missCount)).toEqual({ title, stars });
  });
});

describe("getMissNote", () => {
  it("ミスがあれば★3の条件、無ければパーフェクト", () => {
    expect(getMissNote(1)).toBe("ミス 0回で ★3つ！");
    expect(getMissNote(0)).toBe("パーフェクト！");
  });
});

describe("getNoticeTexts", () => {
  /** テスト用の結果を作る。 */
  const result = (overrides: Partial<BattleResult>): BattleResult => ({
    boss: { id: "b", emoji: "👹", name: "ボス" },
    missCount: 2,
    killCountBefore: 1,
    killCountAfter: 2,
    perfectCount: 0,
    ...overrides,
  });

  it("何も当てはまらなければ空", () => {
    expect(getNoticeTexts(result({}))).toEqual([]);
  });

  it("初めて倒したときは NEW、パーフェクトなら続けて回数を出す（図鑑 → パーフェクトの順）", () => {
    expect(getNoticeTexts(result({ killCountBefore: 0, missCount: 0, perfectCount: 2 }))).toEqual([
      "NEW！ボス図鑑に登録された！",
      "パーフェクト勝利 2回目！",
    ]);
  });

  it("3回目の撃破は銀、5回目は金へのランクアップ", () => {
    expect(getNoticeTexts(result({ killCountBefore: 2 }))).toEqual([
      "ランクアップ！ 枠が銀になった",
    ]);
    expect(getNoticeTexts(result({ killCountBefore: 4 }))).toEqual([
      "ランクアップ！ 枠が金になった",
    ]);
  });
});
