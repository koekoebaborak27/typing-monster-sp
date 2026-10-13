import { createInitialProgress } from "./schema";
import { ProgressStorageError, readProgress, writeProgress } from "./storage";
import type { Level, Progress } from "./types";

let memoryProgress = createInitialProgress();
let storageAvailable: boolean | null = null;
let writesAllowed = true;

/** 呼び出し元が内部の配列や記録を直接書き換えないよう複製する。 */
function copyProgress(progress: Progress): Progress {
  return {
    ...progress,
    wrongIds: [...progress.wrongIds],
    recentIds: {
      1: [...progress.recentIds[1]],
      2: [...progress.recentIds[2]],
      3: [...progress.recentIds[3]],
    },
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
 * 各問題への最初の解答を「まちがえた問題」に反映する。
 * 正解ならその問題を外し、不正解なら末尾へ加える（すでにあれば何もしない）。
 */
export function recordFirstAnswer(questionId: string, isCorrect: boolean): void {
  updateProgress((progress) => {
    // 正解した問題は覚えられたとみなし、リベンジの対象から外す。
    if (isCorrect) {
      return { ...progress, wrongIds: progress.wrongIds.filter((id) => id !== questionId) };
    }
    return progress.wrongIds.includes(questionId)
      ? progress
      : { ...progress, wrongIds: [...progress.wrongIds, questionId] };
  });
}

/** 難易度ごとの最近出た問題を古い順に保ち、直近20件だけ残す。 */
export function recordRecentIds(level: Level, ids: string[]): void {
  updateProgress((progress) => {
    const recent = progress.recentIds[level];
    const next = [...recent.filter((id) => !ids.includes(id)), ...ids];
    return {
      ...progress,
      recentIds: { ...progress.recentIds, [level]: [...new Set(next)].slice(-20) },
    };
  });
}

/** 次のバトルで避けるボスIDを記録する。 */
export function recordLastBoss(bossId: string): void {
  updateProgress((progress) => ({ ...progress, lastBossId: bossId }));
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
 * まちがえた問題やサウンド設定など、図鑑に関係しない記録はそのまま残す。
 */
export function resetZukan(): void {
  updateProgress((progress) => ({ ...progress, bossKills: {}, perfectCount: 0 }));
}

/** 出題元に存在しなかった問題IDを、間違いの記録から取り除く。 */
export function removeWrongIds(ids: string[]): void {
  const removed = new Set(ids);
  updateProgress((progress) => ({
    ...progress,
    wrongIds: progress.wrongIds.filter((id) => !removed.has(id)),
  }));
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
