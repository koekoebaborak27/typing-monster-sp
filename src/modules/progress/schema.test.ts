/**
 * 対象: progress/schema
 * 目的: 保存データの版を守りながら、不正な項目だけ初期値へ戻して使える形にすること
 */
import { describe, expect, it } from "vitest";
import { createInitialProgress, parseProgress } from "./schema";

describe("progress/schema parseProgress", () => {
  describe("保存データが無い、または全体が壊れているとき", () => {
    it("初期値を返す", () => {
      expect(parseProgress(null)).toEqual(createInitialProgress());
    });

    it("オブジェクトでない値なら初期値を返す", () => {
      expect(parseProgress(["壊れた値"])).toEqual(createInitialProgress());
    });
  });

  describe("version が現在の版と異なるとき", () => {
    it("古い版なら初期値を返す", () => {
      expect(parseProgress({ version: 0, wrongIds: ["old-id"] })).toEqual(createInitialProgress());
    });

    it("新しい版なら上書きを防ぐため null を返す", () => {
      expect(parseProgress({ version: 2, wrongIds: ["new-id"] })).toBeNull();
    });

    it("版番号が整数でなければ初期値を返す", () => {
      expect(parseProgress({ version: 1.5 })).toEqual(createInitialProgress());
    });
  });

  describe("version 1 の項目に不正な値があるとき", () => {
    it("不正な項目だけ初期値にし、有効な項目を残す", () => {
      expect(
        parseProgress({
          version: 1,
          wrongIds: ["q1", 4, "q1", ""],
          recentIds: { "1": ["q2", null], "2": "壊れた値", "3": ["q3"] },
          lastBossId: 123,
          bossKills: { "ukkari-tako": 2, "hikkake-oni": -1, "awate-zame": 1.5 },
          perfectCount: "2",
          soundOn: false,
        }),
      ).toEqual({
        version: 1,
        wrongIds: ["q1", ""],
        recentIds: { 1: ["q2"], 2: [], 3: ["q3"] },
        lastBossId: null,
        bossKills: { "ukkari-tako": 2 },
        perfectCount: 0,
        soundOn: false,
      });
    });

    it("ボスの一覧に無いIDも捨てずに残す（扱いは boss モジュールが決める）", () => {
      const progress = parseProgress({
        version: 1,
        lastBossId: "unknown-boss",
        bossKills: { "unknown-boss": 4 },
      });
      expect(progress?.lastBossId).toBe("unknown-boss");
      expect(progress?.bossKills).toEqual({ "unknown-boss": 4 });
    });

    it("最近出た問題は重複を除いて新しい20件だけ残す", () => {
      const ids = Array.from({ length: 22 }, (_, index) => `q${index}`);
      const result = parseProgress({
        version: 1,
        recentIds: { "1": [...ids, "q21"], "2": [], "3": [] },
      });

      expect(result?.recentIds[1]).toEqual(ids.slice(2));
    });

    it("正しい保存データは各項目をそのまま返す", () => {
      const data = {
        version: 1,
        wrongIds: ["q1"],
        recentIds: { "1": ["q2"], "2": [], "3": [] },
        lastBossId: "ukkari-tako",
        bossKills: { "ukkari-tako": 1 },
        perfectCount: 3,
        soundOn: true,
      };

      expect(parseProgress(data)).toEqual(data);
    });
  });
});
