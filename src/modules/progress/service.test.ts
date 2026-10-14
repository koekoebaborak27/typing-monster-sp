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
          recentIds: ["w-001"],
          lastBossId: null,
          bossKills: {},
          perfectCount: 0,
          soundOn: false,
        }),
      );
      const service = await loadService();

      expect(service.loadProgress().recentIds).toEqual(["w-001"]);
      expect(service.isStorageAvailable()).toBe(true);
    });

    it("返した配列が書き換えられても内部の記録を変えない", async () => {
      useStorage();
      const service = await loadService();
      const progress = service.loadProgress();
      progress.recentIds.push("outside");

      expect(service.loadProgress().recentIds).toEqual([]);
    });
  });
});

describe("progress/service recordBattleStart", () => {
  describe("バトルを始めるとき", () => {
    it("ボスのIDと言葉のIDを1回の保存で記録する", async () => {
      const storage = useStorage();
      const service = await loadService();

      service.recordBattleStart("renda-dako", ["w-001", "w-002"]);

      const progress = service.loadProgress();
      expect(progress.lastBossId).toBe("renda-dako");
      expect(progress.recentIds).toEqual(["w-001", "w-002"]);
      expect(storage.localStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it("同じIDを重複させず、直近20件を古い順に保つ", async () => {
      useStorage();
      const service = await loadService();
      service.recordBattleStart(
        "renda-dako",
        Array.from({ length: 20 }, (_, index) => `w-${index}`),
      );
      service.recordBattleStart("renda-dako", ["w-5", "w-20"]);

      const { recentIds } = service.loadProgress();
      expect(recentIds).toHaveLength(20);
      expect(recentIds[0]).toBe("w-1");
      expect(recentIds.slice(-2)).toEqual(["w-5", "w-20"]);
    });
  });
});

describe("progress/service の各記録更新", () => {
  describe("ボス・勝利・設定を更新するとき", () => {
    it("公開APIごとの値を記録する", async () => {
      useStorage();
      const service = await loadService();

      service.recordBattleStart("renda-dako", ["w-001"]);
      service.recordBattleWin("renda-dako", true);
      service.recordBattleWin("misstouch-oni", false);
      service.setSoundOn(false);

      expect(service.loadProgress()).toEqual({
        version: 1,
        recentIds: ["w-001"],
        lastBossId: "renda-dako",
        bossKills: { "renda-dako": 1, "misstouch-oni": 1 },
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
      service.recordBattleStart("renda-dako", ["w-001"]);
      service.setSoundOn(false);
      service.recordBattleWin("renda-dako", true);

      service.resetZukan();

      const progress = service.loadProgress();
      expect(progress.bossKills).toEqual({});
      expect(progress.perfectCount).toBe(0);
      expect(progress.recentIds).toEqual(["w-001"]);
      expect(progress.lastBossId).toBe("renda-dako");
      expect(progress.soundOn).toBe(false);
    });
  });
});

describe("progress/service 保存に失敗したとき", () => {
  describe("読み込みに失敗するとき", () => {
    it("メモリ上の記録を保ち、保存不可を返す", async () => {
      const storage = useStorage();
      const service = await loadService();
      service.recordBattleStart("renda-dako", ["w-001"]);
      storage.localStorage.getItem.mockImplementation(() => {
        throw new Error("読み取り不可");
      });

      service.recordBattleWin("renda-dako", false);

      expect(service.isStorageAvailable()).toBe(false);
      expect(service.loadProgress()).toMatchObject({
        recentIds: ["w-001"],
        bossKills: { "renda-dako": 1 },
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
      service.recordBattleStart("renda-dako", ["w-001"]);

      expect(service.isStorageAvailable()).toBe(false);
      expect(service.loadProgress()).toMatchObject({ soundOn: false, recentIds: ["w-001"] });
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
