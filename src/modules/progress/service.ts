import { RECENT_LIMIT, createInitialProgress } from "./schema";
import { ProgressStorageError, readProgress, writeProgress } from "./storage";
import type { Progress } from "./types";

let memoryProgress = createInitialProgress();
let storageAvailable: boolean | null = null;
let writesAllowed = true;

/** 呼び出し元が内部の配列や記録を直接書き換えないよう複製する。 */
function copyProgress(progress: Progress): Progress {
  return {
    ...progress,
    recentIds: [...progress.recentIds],
    bossKills: { ...progress.bossKills },
  };
}

/** 保存データを読み直し、読み書きに失敗した後はメモリの記録を使う。 */
function refreshProgress(): Progress {
  if (storageAvailable === false || !writesAllowed) return copyProgress(memoryProgress);

  try {
    const stored = readProgress();
    if (stored === null) {
      memoryProgress = createInitialProgress();
      writesAllowed = false;
    } else {
      memoryProgress = stored;
      writesAllowed = true;
    }
    storageAvailable = true;
  } catch (error) {
    if (!(error instanceof ProgressStorageError)) throw error;
    storageAvailable = false;
    writesAllowed = false;
  }

  return copyProgress(memoryProgress);
}

/** 変更をメモリへ反映し、保存できる場合だけ localStorage へ書き戻す。 */
function updateProgress(change: (progress: Progress) => Progress): void {
  const current = refreshProgress();
  const updated = change(current);
  memoryProgress = updated;

  if (!writesAllowed) return;

  try {
    writeProgress(updated);
    storageAvailable = true;
  } catch (error) {
    if (!(error instanceof ProgressStorageError)) throw error;
    storageAvailable = false;
    writesAllowed = false;
  }
}

/** ホーム表示や更新前に使う、保存データの現在値を返す。 */
export function loadProgress(): Progress {
  return refreshProgress();
}

/**
 * バトルの開始を記録する。選んだボスのIDと、選んだ言葉のIDを1回で保存する。
 * 言葉のIDは「最近出た言葉」の末尾へ加え、古いものから捨てて新しい分だけ残す。
 */
export function recordBattleStart(bossId: string, wordIds: string[]): void {
  updateProgress((progress) => {
    // 今回の言葉がすでに入っていたら一度外し、新しい側（末尾）へ入れ直す。
    const next = [...progress.recentIds.filter((id) => !wordIds.includes(id)), ...wordIds];
    return { ...progress, lastBossId: bossId, recentIds: [...new Set(next)].slice(-RECENT_LIMIT) };
  });
}

/** 勝利数を増やし、パーフェクト勝利ならその回数も増やす。 */
export function recordBattleWin(bossId: string, isPerfect: boolean): void {
  updateProgress((progress) => ({
    ...progress,
    bossKills: { ...progress.bossKills, [bossId]: (progress.bossKills[bossId] ?? 0) + 1 },
    perfectCount: progress.perfectCount + Number(isPerfect),
  }));
}

/**
 * ボス図鑑の記録（ボスごとの撃破回数とパーフェクト勝利の回数）を空にする。
 * 直前のボスや最近出た言葉、サウンド設定など、図鑑に関係しない記録はそのまま残す。
 */
export function resetZukan(): void {
  updateProgress((progress) => ({ ...progress, bossKills: {}, perfectCount: 0 }));
}

/** サウンド設定を記録する。 */
export function setSoundOn(on: boolean): void {
  updateProgress((progress) => ({ ...progress, soundOn: on }));
}

/** localStorage の読み書きに失敗したかを返し、未確認なら先に読み込みを行う。 */
export function isStorageAvailable(): boolean {
  if (storageAvailable === null) refreshProgress();
  return storageAvailable === true;
}
