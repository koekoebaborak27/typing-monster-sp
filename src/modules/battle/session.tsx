"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { BattleResult } from "./battle-result";

/** BattleSession（画面間で受け渡すメモリ）から画面が使えるもの。 */
type BattleSessionValue = {
  /** バトルを始めてよいか。初期値は false。 */
  canStart: boolean;
  /** 結果画面に出す値。無ければ null。 */
  result: BattleResult | null;
  /** ホームの「バトル スタート」や結果の「もう1回」を押したとき。バトルを始めてよい印を付ける。前の結果は、バトル画面が始まるときに捨てる（結果画面が先に空になってホームへ戻されないように）。 */
  startBattle: () => void;
  /** バトル画面が、結果を置く（とどめの一撃のとき）、または消す（バトルを始めるとき）。 */
  setResult: (result: BattleResult | null) => void;
};

const BattleSessionContext = createContext<BattleSessionValue | null>(null);

/**
 * BattleSession を持つ。`app/layout.tsx` に置き、画面を移動しても値が消えないようにする。
 * 再読み込みや画面を閉じると消える（途中で離れたバトルを破棄する要件と一致する）。
 */
export function BattleSessionProvider({ children }: { children: ReactNode }) {
  const [canStart, setCanStart] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);

  const startBattle = useCallback(() => {
    setCanStart(true);
  }, []);

  const value = useMemo<BattleSessionValue>(
    () => ({ canStart, result, startBattle, setResult }),
    [canStart, result, startBattle],
  );

  return <BattleSessionContext.Provider value={value}>{children}</BattleSessionContext.Provider>;
}

/** BattleSession を使う。BattleSessionProvider の外で呼ぶと実装ミスなので、すぐ気づけるよう投げる。 */
export function useBattleSession(): BattleSessionValue {
  const value = useContext(BattleSessionContext);
  if (!value) throw new Error("useBattleSession は BattleSessionProvider の中で使う");
  return value;
}
