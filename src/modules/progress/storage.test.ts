/**
 * 対象: progress/storage
 * 目的: localStorage のキー・JSON形式・読み書き失敗の扱いを担保すること
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressStorageError, readProgress, writeProgress } from "./storage";
import type { Progress } from "./types";

const STORAGE_KEY = "quiz-monster";

/** テスト用の localStorage を用意し、保存値と失敗を操作できるようにする。 */
function useStorage(initialValue: string | null = null) {
  let value = initialValue;
  const localStorage = {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
  vi.stubGlobal("localStorage", localStorage);
  return { localStorage, getValue: () => value };
}

afterEach(() => vi.unstubAllGlobals());

describe("progress/storage readProgress", () => {
  describe("キーに値が無い、または JSON が壊れているとき", () => {
    it("初期値を返す", () => {
      useStorage();
      expect(readProgress()).toMatchObject({
        version: 1,
        wrongIds: [],
        soundOn: true,
      });
    });

    it("壊れた JSON なら初期値を返す", () => {
      useStorage("{");
      expect(readProgress()).toMatchObject({ wrongIds: [], soundOn: true });
    });
  });

  describe("保存データの版が新しいとき", () => {
    it("null を返し、キーの値を変更しない", () => {
      const storage = useStorage('{"version":2}');

      expect(readProgress()).toBeNull();
      expect(storage.localStorage.setItem).not.toHaveBeenCalled();
      expect(storage.getValue()).toBe('{"version":2}');
    });
  });

  describe("localStorage の読み取りに失敗したとき", () => {
    it("失敗を呼び出し元へ伝える", () => {
      const storage = useStorage();
      storage.localStorage.getItem.mockImplementation(() => {
        throw new Error("読み取り不可");
      });

      expect(() => readProgress()).toThrow(ProgressStorageError);
    });
  });
});

describe("progress/storage writeProgress", () => {
  describe("記録を書き込むとき", () => {
    it("quiz-monster キーへ version 1 の JSON を保存する", () => {
      const storage = useStorage();
      const progress: Progress = {
        version: 1,
        wrongIds: ["q1"],
        recentIds: { 1: [], 2: [], 3: [] },
        lastBossId: null,
        bossKills: {},
        perfectCount: 0,
        soundOn: false,
      };

      writeProgress(progress);

      expect(storage.localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(progress),
      );
      expect(JSON.parse(storage.getValue() ?? "")).toEqual(progress);
    });

    it("localStorage の書き込み失敗を呼び出し元へ伝える", () => {
      const storage = useStorage();
      storage.localStorage.setItem.mockImplementation(() => {
        throw new Error("書き込み不可");
      });

      expect(() =>
        writeProgress({
          version: 1,
          wrongIds: [],
          recentIds: { 1: [], 2: [], 3: [] },
          lastBossId: null,
          bossKills: {},
          perfectCount: 0,
          soundOn: true,
        }),
      ).toThrow(ProgressStorageError);
    });
  });
});
