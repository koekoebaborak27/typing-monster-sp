import { fetchQuestions } from "./api-client";
import type { FetchQuestionsResult } from "./api-client";
import type { BattleStart } from "./types";

/** 先読みの1件分。 */
type PrefetchEntry = {
  /** 何の条件で取得したか。 */
  start: BattleStart;
  /** 先読みのきっかけになった結果。同じ結果で2回始めないための目印に使う。 */
  owner: object;
  /** 出題APIの返事を待つ Promise。 */
  promise: Promise<FetchQuestionsResult>;
  /** 失敗が分かったら true にする。 */
  failed: boolean;
};

/** 次のバトルの問題の先読みを持つ入れ物。画面には表示しないので React の状態にはしない。 */
export type PrefetchStore = {
  /** 先読みを始める。同じ `owner` ですでに先読みがあれば何もしない。 */
  begin(start: BattleStart, owner: object): void;
  /** 先読みを取り出して空にする。使えるものが無ければ null。 */
  take(start: BattleStart): Promise<FetchQuestionsResult> | null;
  /** 先読みを捨てる。 */
  discard(): void;
};

/** 2つの開始条件が同じかを調べる。 */
function isSameStart(a: BattleStart, b: BattleStart): boolean {
  if (a.mode === "revenge" || b.mode === "revenge") return a.mode === b.mode;
  return a.level === b.level;
}

/**
 * 先読みの入れ物を作る。
 * 取得を行う関数は差し替えられる（本番は `fetchQuestions`、テストでは偽物）。
 */
export function createPrefetchStore(
  fetcher: (start: BattleStart) => Promise<FetchQuestionsResult> = fetchQuestions,
): PrefetchStore {
  let current: PrefetchEntry | null = null;

  return {
    begin(start, owner) {
      // 開発時の React は画面を開いたときの処理を2回動かすので、同じ結果なら出題APIを2回呼ばない。
      if (current?.owner === owner) return;
      const entry: PrefetchEntry = {
        start,
        owner,
        failed: false,
        // 通信の失敗は fetchQuestions が値で返すが、想定外の例外も「失敗」として扱う。
        promise: fetcher(start).catch((): FetchQuestionsResult => ({
          ok: false,
          reason: "failed",
        })),
      };
      current = entry;
      void entry.promise.then((result) => {
        // 返事が届く前に捨てられた・別の先読みに替わった場合は、印を付けない。
        if (!result.ok && current === entry) entry.failed = true;
      });
    },
    take(start) {
      const entry = current;
      // 条件が違う先読みは使えない。失敗した先読みも使わず、新しく取得し直してもらう。
      if (!entry || entry.failed || !isSameStart(entry.start, start)) return null;
      // 同じ問題で2回バトルしないよう、取り出したら空にする。
      current = null;
      return entry.promise;
    },
    discard() {
      // 取得中の返事が後から届いても、入れ物とは無関係になるので使われない。
      current = null;
    },
  };
}
