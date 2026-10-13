"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FetchQuestionsResult } from "./api-client";
import { createPrefetchStore } from "./prefetch";
import type { BattleResult, BattleStart } from "./types";

/** BattleSession（画面間で受け渡すメモリ）から画面が使えるもの。 */
type BattleSessionValue = {
  /** 次に始めるバトルの条件。無ければ null。 */
  start: BattleStart | null;
  /** 結果画面に出す値。無ければ null。 */
  result: BattleResult | null;
  /** ホームで難易度／リベンジを押したとき。条件を置き、前の結果と先読みを捨てる。 */
  startBattle: (start: BattleStart) => void;
  /** バトル画面が問題の取得を始めるとき。前の結果を消し、使える先読みがあれば取り出す。 */
  beginFetch: (start: BattleStart) => Promise<FetchQuestionsResult> | null;
  /** とどめの一撃のとき。結果を置く。 */
  setResult: (result: BattleResult) => void;
  /** 結果画面を開いたとき。条件を満たせば次のバトルの問題を先読みする。 */
  prefetchNext: (result: BattleResult) => void;
  /** 結果で「ホームへ」を押したとき。先読みを捨てる。 */
  discardPrefetch: () => void;
};

const BattleSessionContext = createContext<BattleSessionValue | null>(null);

/**
 * BattleSession を持つ。`app/layout.tsx` に置き、画面を移動しても値が消えないようにする。
 * 再読み込みや画面を閉じると消える（途中で離れたバトルを破棄する要件と一致する）。
 */
export function BattleSessionProvider({ children }: { children: ReactNode }) {
  // start と result は画面の表示に使うので React の状態で持つ。
  const [start, setStart] = useState<BattleStart | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  // 先読みは画面に表示しないので、再描画を起こさない入れ物で持つ。
  const [prefetch] = useState(() => createPrefetchStore());

  const startBattle = useCallback(
    (next: BattleStart) => {
      setStart(next);
      setResult(null);
      prefetch.discard();
    },
    [prefetch],
  );

  const beginFetch = useCallback(
    (next: BattleStart) => {
      // URL を直接開いたときに前のバトルの結果を出さないよう、バトル開始時に結果を消す。
      setResult(null);
      return prefetch.take(next);
    },
    [prefetch],
  );

  const prefetchNext = useCallback(
    (current: BattleResult) => {
      // リベンジを遊び切ったときは、次のバトルが無いので先読みしない。
      if (current.revengeCleared) return;
      prefetch.begin(current.start, current);
    },
    [prefetch],
  );

  const value = useMemo<BattleSessionValue>(
    () => ({
      start,
      result,
      startBattle,
      beginFetch,
      setResult,
      prefetchNext,
      discardPrefetch: prefetch.discard,
    }),
    [start, result, startBattle, beginFetch, prefetchNext, prefetch],
  );

  return <BattleSessionContext.Provider value={value}>{children}</BattleSessionContext.Provider>;
}

/** BattleSession を使う。BattleSessionProvider の外で呼ぶと実装ミスなので、すぐ気づけるよう投げる。 */
export function useBattleSession(): BattleSessionValue {
  const value = useContext(BattleSessionContext);
  if (!value) throw new Error("useBattleSession は BattleSessionProvider の中で使う");
  return value;
}
