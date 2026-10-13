import { createInitialProgress, parseProgress, CURRENT_VERSION } from "./schema";
import type { Progress } from "./types";

const STORAGE_KEY = "quiz-monster";

/** localStorage の読み書きに失敗したことを service へ伝えるエラー。 */
export class ProgressStorageError extends Error {
  constructor(operation: "read" | "write", cause: unknown) {
    super(`localStorage の${operation === "read" ? "読み取り" : "書き込み"}に失敗しました`, {
      cause,
    });
    this.name = "ProgressStorageError";
  }
}

/**
 * localStorage から記録を読み、壊れた JSON は初期値として扱う。
 * localStorage 自体の読み書き失敗は専用エラーにして service へ伝える。
 */
export function readProgress(): Progress | null {
  let serialized: string | null;
  try {
    serialized = globalThis.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    throw new ProgressStorageError("read", error);
  }
  if (serialized === null) return createInitialProgress();

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return createInitialProgress();
  }

  return parseProgress(value);
}

/** 記録全体を現在の版として1つのキーへ書き込む。 */
export function writeProgress(progress: Progress): void {
  const serialized = JSON.stringify({ ...progress, version: CURRENT_VERSION });
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    throw new ProgressStorageError("write", error);
  }
}
