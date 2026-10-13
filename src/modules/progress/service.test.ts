/**
 * 対象: progress/service
 * 目的: 記録の更新規則と、保存失敗後もページを開いている間は使えることを担保する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

/** テスト用 localStorage を作り、保存データと失敗を操作できるようにする。 */
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

/** module 内のメモリ状態を初期化して、各テストを独立させる。 */
async function loadService() {
  vi.resetModules();
  return import("./service");
}

afterEach(() => vi.unstubAllGlobals());

describe("progress/service loadProgress", () => {
  describe("保存データを読み込むとき", () => {
    it("localStorage の内容を返す", async () => {
      useStorage(
        JSON.stringify({
          version: 1,
          wrongIds: ["q1"],
          recentIds: { "1": [], "2": [], "3": [] },
          lastBossId: null,
          bossKills: {},
          perfectCount: 0,
          soundOn: false,
        }),
      );
      const service = await loadService();

      expect(service.loadProgress().wrongIds).toEqual(["q1"]);
      expect(service.isStorageAvailable()).toBe(true);
    });

    it("返した配列が書き換えられても内部の記録を変えない", async () => {
      useStorage();
      const service = await loadService();
      const progress = service.loadProgress();
      progress.wrongIds.push("outside");

      expect(service.loadProgress().wrongIds).toEqual([]);
    });
  });
});

describe("progress/service recordFirstAnswer", () => {
  describe("最初の解答が不正解のとき", () => {
    it("末尾へ加え、すでにあれば重複させない", async () => {
      const storage = useStorage();
      const service = await loadService();

      service.recordFirstAnswer("q1", false);
      service.recordFirstAnswer("q2", false);
      service.recordFirstAnswer("q1", false);

      expect(service.loadProgress().wrongIds).toEqual(["q1", "q2"]);
      expect(JSON.parse(storage.getValue() ?? "").wrongIds).toEqual(["q1", "q2"]);
    });
  });

  describe("最初の解答が正解のとき", () => {
    it("まちがえた問題から外す", async () => {
      const storage = useStorage();
      const service = await loadService();

      service.recordFirstAnswer("q1", false);
      service.recordFirstAnswer("q2", false);
      service.recordFirstAnswer("q1", true);

      expect(service.loadProgress().wrongIds).toEqual(["q2"]);
      expect(JSON.parse(storage.getValue() ?? "").wrongIds).toEqual(["q2"]);
    });

    it("まちがえた問題に無ければ何も変えない", async () => {
      useStorage();
      const service = await loadService();

      service.recordFirstAnswer("q1", true);

      expect(service.loadProgress().wrongIds).toEqual([]);
    });
  });
});

describe("progress/service recordRecentIds", () => {
  describe("難易度ごとに問題を記録するとき", () => {
    it("同じIDを重複させず、直近20件を古い順に保つ", async () => {
      useStorage();
      const service = await loadService();
      service.recordRecentIds(
        1,
        Array.from({ length: 20 }, (_, index) => `q${index}`),
      );
      service.recordRecentIds(1, ["q5", "q20"]);
      service.recordRecentIds(2, ["other"]);

      const progress = service.loadProgress();
      expect(progress.recentIds[1]).toHaveLength(20);
      expect(progress.recentIds[1][0]).toBe("q1");
      expect(progress.recentIds[1].slice(-2)).toEqual(["q5", "q20"]);
      expect(progress.recentIds[2]).toEqual(["other"]);
    });
  });
});

describe("progress/service の各記録更新", () => {
  describe("ボス・勝利・設定を更新するとき", () => {
    it("公開APIごとの値を記録し、指定IDを間違い一覧から除く", async () => {
      useStorage();
      const service = await loadService();

      service.recordFirstAnswer("q1", false);
      service.recordFirstAnswer("q2", false);
      service.removeWrongIds(["q1"]);
      service.recordLastBoss("ukkari-tako");
      service.recordBattleWin("ukkari-tako", true);
      service.recordBattleWin("hikkake-oni", false);
      service.setSoundOn(false);

      expect(service.loadProgress()).toEqual({
        version: 1,
        wrongIds: ["q2"],
        recentIds: { 1: [], 2: [], 3: [] },
        lastBossId: "ukkari-tako",
        bossKills: { "ukkari-tako": 1, "hikkake-oni": 1 },
        perfectCount: 1,
        soundOn: false,
      });
    });
  });
});

describe("progress/service resetZukan", () => {
  describe("図鑑をリセットするとき", () => {
    it("撃破回数とパーフェクト回数だけを空にし、他の記録は残す", async () => {
      useStorage();
      const service = await loadService();
      service.recordFirstAnswer("q1", false);
      service.setSoundOn(false);
      service.recordBattleWin("ukkari-tako", true);

      service.resetZukan();

      const progress = service.loadProgress();
      expect(progress.bossKills).toEqual({});
      expect(progress.perfectCount).toBe(0);
      expect(progress.wrongIds).toEqual(["q1"]);
      expect(progress.soundOn).toBe(false);
    });
  });
});

describe("progress/service 保存に失敗したとき", () => {
  describe("読み込みに失敗するとき", () => {
    it("メモリ上の記録を保ち、保存不可を返す", async () => {
      const storage = useStorage();
      const service = await loadService();
      service.recordFirstAnswer("q1", false);
      storage.localStorage.getItem.mockImplementation(() => {
        throw new Error("読み取り不可");
      });

      service.recordBattleWin("ukkari-tako", false);

      expect(service.isStorageAvailable()).toBe(false);
      expect(service.loadProgress()).toMatchObject({
        wrongIds: ["q1"],
        bossKills: { "ukkari-tako": 1 },
      });
      expect(storage.localStorage.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe("書き込みに失敗するとき", () => {
    it("変更をメモリに残し、その後は localStorage を使わない", async () => {
      const storage = useStorage();
      const service = await loadService();
      service.loadProgress();
      storage.localStorage.setItem.mockImplementation(() => {
        throw new Error("書き込み不可");
      });

      service.setSoundOn(false);
      const readCountAfterFailure = storage.localStorage.getItem.mock.calls.length;
      service.recordFirstAnswer("q1", false);

      expect(service.isStorageAvailable()).toBe(false);
      expect(service.loadProgress()).toMatchObject({ soundOn: false, wrongIds: ["q1"] });
      expect(storage.localStorage.getItem).toHaveBeenCalledTimes(readCountAfterFailure);
      expect(storage.localStorage.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe("新しい版の保存データがあるとき", () => {
    it("保存データを上書きせず、保存不可の表示もしない", async () => {
      const storage = useStorage('{"version":2,"future":"keep"}');
      const service = await loadService();

      service.setSoundOn(false);

      expect(service.loadProgress().soundOn).toBe(false);
      expect(service.isStorageAvailable()).toBe(true);
      expect(storage.localStorage.setItem).not.toHaveBeenCalled();
      expect(storage.getValue()).toBe('{"version":2,"future":"keep"}');
    });
  });
});
