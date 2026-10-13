import { z } from "zod";
import type { Level, Progress } from "./types";

/** localStorage に保存するデータの現在の版。 */
export const CURRENT_VERSION = 1;

const objectSchema = z.record(z.string(), z.unknown());
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const positiveIntegerSchema = z.number().int().positive();

/** 初期状態を新しいオブジェクトとして返す。 */
export function createInitialProgress(): Progress {
  return {
    version: CURRENT_VERSION,
    wrongIds: [],
    recentIds: { 1: [], 2: [], 3: [] },
    lastBossId: null,
    bossKills: {},
    perfectCount: 0,
    soundOn: true,
  };
}

/** 配列から不正値と重複を除き、必要なら末尾の件数に切り詰める。 */
function readIds(value: unknown, limit?: number): string[] {
  const array = z.array(z.unknown()).safeParse(value);
  if (!array.success) return [];

  const ids = [
    ...new Set(array.data.filter((item): item is string => z.string().safeParse(item).success)),
  ];
  return limit === undefined ? ids : ids.slice(-limit);
}

/** 壊れた項目だけ初期値へ戻し、有効な保存データを組み立てる。 */
function readCurrentProgress(data: Record<string, unknown>): Progress {
  const initial = createInitialProgress();
  const recent = objectSchema.safeParse(data.recentIds);
  const recentIds: Record<Level, string[]> = { 1: [], 2: [], 3: [] };

  if (recent.success) {
    recentIds[1] = readIds(recent.data["1"], 20);
    recentIds[2] = readIds(recent.data["2"], 20);
    recentIds[3] = readIds(recent.data["3"], 20);
  }

  const rawKills = objectSchema.safeParse(data.bossKills);
  const bossKills: Progress["bossKills"] = {};
  if (rawKills.success) {
    for (const [bossId, count] of Object.entries(rawKills.data)) {
      // ボスの一覧に無いIDでも捨てない（一覧の変更で撃破回数が消えないようにする。図鑑側で無視する）。
      const validCount = positiveIntegerSchema.safeParse(count);
      if (!validCount.success) continue;
      bossKills[bossId] = validCount.data;
    }
  }

  // ボスの一覧に無いIDでもそのまま返す。一覧に無いときは boss モジュールが null と同じに扱う。
  const lastBossId = z.string().nullable().safeParse(data.lastBossId);
  const perfectCount = nonNegativeIntegerSchema.safeParse(data.perfectCount);
  const soundOn = z.boolean().safeParse(data.soundOn);

  return {
    ...initial,
    wrongIds: readIds(data.wrongIds),
    recentIds,
    lastBossId: lastBossId.success ? lastBossId.data : null,
    bossKills,
    perfectCount: perfectCount.success ? perfectCount.data : initial.perfectCount,
    soundOn: soundOn.success ? soundOn.data : initial.soundOn,
  };
}

/**
 * 保存内容を検証し、アプリで使える形にする。
 * 新しい版のデータは上書きして消さないよう null を返す。
 */
export function parseProgress(value: unknown): Progress | null {
  const data = objectSchema.safeParse(value);
  if (!data.success) return createInitialProgress();

  const version = z.number().int().safeParse(data.data.version);
  if (!version.success || version.data < CURRENT_VERSION) return createInitialProgress();
  if (version.data > CURRENT_VERSION) return null;

  return readCurrentProgress(data.data);
}
