"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickBoss } from "@/modules/boss";
import { loadProgress, recordBattleStart, recordBattleWin } from "@/modules/progress";
import { pickWords } from "@/modules/word";
import { battleReducer, createInitialState, listEffects } from "../battle-reducer";
import { buildBattleResult } from "../battle-result";
import { useBattleSession } from "../session";
import { playSound } from "../sound";
import type { BattleAction, BattleEffect, BattleState } from "../types";

/** ダメージを見せてから次のお題へ進むまでの時間（ミリ秒）。 */
const DAMAGE_WAIT_MS = 1000;

/** とどめの一撃を見せてから結果画面へ移るまでの時間（ミリ秒）。 */
const FINISH_WAIT_MS = 2000;

/**
 * バトル画面用のフック。画面は、返す値を描画して入力欄の通知を渡すだけにする。
 * 状態の計算は `battleReducer`、実行する処理の判断は `listEffects` に任せ、ここでは保存・音・時間待ち・入力欄の操作を行う。
 */
export function useBattle() {
  const router = useRouter();
  const { canStart, setResult } = useBattleSession();
  // バトルの状態。ボスと5語を選ぶまでは null。
  const [state, setState] = useState<BattleState | null>(null);
  // 入力欄に出ている文字。色分けして見せるためだけに持つ（判定には使わない。判定は入力欄の中身の全体を reducer へ渡す）。
  const [inputValue, setInputValue] = useState("");
  // 操作を受け取った時点の最新の状態。再描画を待たずに、次の状態と実行する処理を先に計算するために持つ。
  const stateRef = useRef<BattleState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // このバトルのボスと5語を選んだかどうかの印。開発時に画面を開く処理が2回動いても、選ぶのは1回にするため。
  const startedRef = useRef(false);

  /** 列挙された処理を1つ実行する。 */
  const runEffect = useCallback(
    (effect: BattleEffect, next: BattleState) => {
      switch (effect.type) {
        case "playSound":
          playSound(effect.kind);
          break;
        case "clearInput":
          // 入力欄をこちらで書き換えるのは、次のお題へ進むこの時だけ。
          if (inputRef.current) inputRef.current.value = "";
          setInputValue("");
          break;
        case "recordBattleWin": {
          // 撃破回数が増える前後の数字を保存データから読み、結果画面に出す値を作る。
          const before = loadProgress();
          recordBattleWin(effect.bossId, effect.isPerfect);
          const after = loadProgress();
          setResult(
            buildBattleResult({
              boss: next.boss,
              missCount: next.missCount,
              killCountBefore: before.bossKills[effect.bossId] ?? 0,
              killCountAfter: after.bossKills[effect.bossId] ?? 0,
              perfectCount: after.perfectCount,
            }),
          );
          break;
        }
      }
    },
    [setResult],
  );

  /**
   * 操作を受け取る。次の状態と実行する処理を先に計算し、処理を実行してから状態を更新する。
   * 保存や音を再描画のきっかけの処理で行うと、開発時に2回動いて記録が二重になるため、ここで行う。
   */
  const send = useCallback(
    (action: BattleAction) => {
      const prev = stateRef.current;
      if (!prev) return;
      const next = battleReducer(prev, action);
      // 無視される操作（ダメージ表示中の入力など）は、状態が変わらないので何もしない。
      if (next === prev) return;
      for (const effect of listEffects(prev, next)) runEffect(effect, next);
      stateRef.current = next;
      setState(next);
    },
    [runEffect],
  );

  // 画面を開いたとき。開始の許可が無ければ（URLを直接開いたとき等）ホームへ戻し、あればボスと5語を選んで始める。
  useEffect(() => {
    if (!canStart) {
      router.replace("/");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    // 前のバトルの結果を残さない。
    setResult(null);
    // 直前と同じボスが続かないよう直前のボスを避けて選び、最近出た言葉を避けて5語を選ぶ。
    const progress = loadProgress();
    const boss = pickBoss(progress.lastBossId, Math.random);
    const words = pickWords(progress.recentIds, Math.random);
    // 選んだボスと言葉を、1回でまとめて保存する。
    recordBattleStart(
      boss.id,
      words.map((word) => word.id),
    );
    const initial = createInitialState(boss, words);
    stateRef.current = initial;
    setState(initial);
  }, [canStart, router, setResult]);

  // 状態ができたら、すぐ打てるように入力欄を選んだ状態にする。
  const ready = state !== null;
  useEffect(() => {
    if (ready) inputRef.current?.focus();
  }, [ready]);

  // 時間待ち。ダメージ表示は約1秒で次のお題へ、とどめの一撃は約2秒で結果画面へ。画面を離れたら止める。
  const phase = state?.phase;
  useEffect(() => {
    if (phase === "damage") {
      const timer = setTimeout(() => send({ type: "damageShown" }), DAMAGE_WAIT_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "finishing") {
      const timer = setTimeout(() => router.replace("/result"), FINISH_WAIT_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, send, router]);

  /** 入力欄の中身が変わったとき。変換中かどうかは問わず、中身の全体を渡す。 */
  const changeInput = useCallback(
    (value: string) => {
      setInputValue(value);
      send({ type: "inputChanged", value });
    },
    [send],
  );

  return { state, inputValue, inputRef, changeInput };
}
