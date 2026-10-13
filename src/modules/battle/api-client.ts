import { loadProgress } from "@/modules/progress";
import type { Progress } from "@/modules/progress";
import type { Question, QuestionRequest, QuestionResponse } from "@/modules/quiz";
import type { BattleStart, FetchErrorKind } from "./types";

/** 出題APIを呼んだ結果。成功か、リベンジできない（409）か、それ以外の失敗か。 */
export type FetchQuestionsResult =
  | { ok: true; questions: Question[]; unknownIds: string[] }
  | { ok: false; reason: "revengeUnavailable"; unknownIds: string[] }
  | { ok: false; reason: "failed" };

/** 差し替えられる部品。本番は標準の fetch と保存データの読み込み、テストでは偽物を渡す。 */
export type ApiClientDeps = {
  fetch?: typeof fetch;
  loadProgress?: () => Progress;
};

/** 1バトルで使う問題の数（通常3問＋予備2問）。 */
const QUESTION_COUNT = 5;

/** 出題APIへ送るリクエストを作る。「まちがえた問題」と「最近出た問題」は呼ぶ時点の保存データから読む。 */
function buildRequest(start: BattleStart, progress: Progress): QuestionRequest {
  if (start.mode === "revenge") return { mode: "revenge", wrongIds: progress.wrongIds };
  return {
    mode: "normal",
    level: start.level,
    recentIds: progress.recentIds[start.level],
    wrongIds: progress.wrongIds,
  };
}

/** 値が文字列だけの配列かを調べる。 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** 取り消し（AbortController）による中断かどうかを調べる。 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** 成功応答の本文が、5問と unknownIds を持つ形かを調べる。 */
function isQuestionResponse(body: unknown): body is QuestionResponse {
  if (typeof body !== "object" || body === null) return false;
  const { questions, unknownIds } = body as Partial<QuestionResponse>;
  return (
    Array.isArray(questions) && questions.length === QUESTION_COUNT && isStringArray(unknownIds)
  );
}

/** 409 の本文から、REVENGE_NOT_AVAILABLE かどうかを調べ、`unknownIds` を取り出す。違えば null。 */
function parseRevengeUnavailable(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { error, unknownIds } = body as { error?: { code?: unknown }; unknownIds?: unknown };
  if (error?.code !== "REVENGE_NOT_AVAILABLE") return null;
  // unknownIds が壊れていても、リベンジできないこと自体は伝えたいので空として扱う。
  return isStringArray(unknownIds) ? unknownIds : [];
}

/**
 * 出題API（POST /api/questions）を呼んで、次のバトルの問題を取得する。
 * 通信の失敗や想定外の応答は、投げずに `{ ok: false, reason: "failed" }` で返す。
 * 取り消し（`signal`）による中断だけは、呼んだ側が見分けられるようそのまま投げ直す。
 */
export async function fetchQuestions(
  start: BattleStart,
  options: { signal?: AbortSignal } & ApiClientDeps = {},
): Promise<FetchQuestionsResult> {
  const { signal, fetch: fetchImpl = fetch, loadProgress: load = loadProgress } = options;
  const request = buildRequest(start, load());

  let response: Response;
  try {
    response = await fetchImpl("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { ok: false, reason: "failed" };
  }

  // 本文を読んでいる途中の取り消しも、呼んだ側へ伝える。
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    body = undefined;
  }

  if (response.status === 409) {
    const unknownIds = parseRevengeUnavailable(body);
    return unknownIds
      ? { ok: false, reason: "revengeUnavailable", unknownIds }
      : { ok: false, reason: "failed" };
  }
  if (response.ok && isQuestionResponse(body)) {
    return { ok: true, questions: body.questions, unknownIds: body.unknownIds };
  }
  // 400・5xx、本文が想定の形でない成功応答は、どれも「取得に失敗」として扱う。
  return { ok: false, reason: "failed" };
}

/**
 * 失敗の結果を、画面に出す取得エラーの種類に変える。
 * 409 はリベンジできない。それ以外の失敗は、オンラインなら「失敗」、オフラインなら「オフライン」にする。
 */
export function toFetchError(
  result: Extract<FetchQuestionsResult, { ok: false }>,
  isOnline: boolean,
): FetchErrorKind {
  if (result.reason === "revengeUnavailable") return "revengeUnavailable";
  return isOnline ? "failed" : "offline";
}
