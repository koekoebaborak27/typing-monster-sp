"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickBoss } from "@/modules/boss";
import {
  loadProgress,
  recordBattleWin,
  recordFirstAnswer,
  recordLastBoss,
  recordRecentIds,
  removeWrongIds,
} from "@/modules/progress";
import type { ChoiceId } from "@/modules/quiz";
import { fetchQuestions, toFetchError } from "../api-client";
import { battleReducer, createInitialState, currentQuestion, listEffects } from "../battle-reducer";
import { buildBattleResult } from "../battle-result";
import { reorderForRetry } from "../scoring";
import { useBattleSession } from "../session";
import { playSound } from "../sound";
import type { BattleAction, BattleEffect, BattleResult, BattleStart, BattleState } from "../types";

/** 正解を見せてから次の問題へ進むまでの時間（ミリ秒）。 */
const CORRECT_WAIT_MS = 1000;

/**
 * バトル画面用のフック。画面は、返す状態を描画して操作を渡すだけにする。
 * 状態の計算は `battleReducer`、実行する処理の判断は `listEffects` に任せ、ここでは保存・音・時間待ち・出題APIの呼び出しを行う。
 */
export function useBattle() {
  const router = useRouter();
  const { start, beginFetch, setResult } = useBattleSession();
  const [state, setState] = useState<BattleState>(createInitialState);
  // 操作を受け取った時点の最新の状態。再描画を待たずに、次の状態と実行する処理を先に計算するために持つ。
  const stateRef = useRef(state);
  // 取得中の出題APIを取り消すための印。
  const controllerRef = useRef<AbortController | null>(null);

  /** 列挙された処理を1つ実行する。 */
  const runEffect = useCallback(
    (effect: BattleEffect, next: BattleState, condition: BattleStart | null) => {
      switch (effect.type) {
        case "playSound":
          playSound(effect.kind);
          break;
        case "recordFirstAnswer":
          recordFirstAnswer(effect.questionId, effect.isCorrect);
          break;
        case "recordBattleWin": {
          if (!next.boss || !condition) break;
          // 撃破回数の更新の前後を比べて、結果画面に出す値を作る。
          const before = loadProgress();
          recordBattleWin(effect.bossId, effect.isPerfect);
          const after = loadProgress();
          const result: BattleResult = buildBattleResult({
            start: condition,
            boss: next.boss,
            life: next.life,
            reviewList: next.reviewList,
            before,
            after,
          });
          setResult(result);
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
      const next = battleReducer(prev, action);
      if (next === prev) return;
      for (const effect of listEffects(prev, next)) runEffect(effect, next, start);
      stateRef.current = next;
      setState(next);
    },
    [runEffect, start],
  );

  /** 問題を取得して、成功なら保存とボス選びをしてバトルを始め、失敗なら取得エラーにする。 */
  const load = useCallback(
    async (condition: BattleStart) => {
      // 前の取得の返事は使わない。
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      send({ type: "fetchStarted" });
      // 結果画面で先読みした問題があればそれを使い、無ければ新しく取得する。
      const prefetched = beginFetch(condition);
      let result;
      try {
        result = await (prefetched ?? fetchQuestions(condition, { signal: controller.signal }));
      } catch {
        // 画面を離れたことによる取り消し。何もしない。
        return;
      }
      if (controller.signal.aborted) return;

      if (!result.ok) {
        // リベンジできないときは、問題データに無かった問題を「まちがえた問題」から外す。
        if (result.reason === "revengeUnavailable") removeWrongIds(result.unknownIds);
        send({ type: "fetchFailed", fetchError: toFetchError(result, navigator.onLine) });
        return;
      }

      if (result.unknownIds.length > 0) removeWrongIds(result.unknownIds);
      // ボスを選ぶには最新の lastBossId が要り、選んだらすぐ保存する。
      const boss = pickBoss(loadProgress().lastBossId, Math.random);
      recordLastBoss(boss.id);
      // 通常モードでは、今回出す問題を「最近出た問題」に加える。
      if (condition.mode === "normal") {
        recordRecentIds(
          condition.level,
          result.questions.map((question) => question.id),
        );
      }
      send({ type: "fetchSucceeded", questions: result.questions, boss });
    },
    [beginFetch, send],
  );

  // 画面を開いたとき。開始情報が無ければホームへ戻し、あれば問題を取得する。離れるときは取得を取り消す。
  useEffect(() => {
    if (!start) {
      router.replace("/");
      return;
    }
    void load(start);
    return () => controllerRef.current?.abort();
  }, [start, load, router]);

  // 時間待ち。正解表示は約1秒で次の問題へ進む。画面を離れたら止める。
  // とどめの一撃のあとは自動で移らず、「けっかをみる」ボタンで結果画面へ移る。
  useEffect(() => {
    if (state.phase === "correct") {
      const timer = setTimeout(() => send({ type: "correctShown" }), CORRECT_WAIT_MS);
      return () => clearTimeout(timer);
    }
  }, [state.phase, send]);

  /** 「けっかをみる」を押したとき。結果画面へ移る。 */
  const goResult = useCallback(() => router.replace("/result"), [router]);

  /** 選択肢を押したとき。 */
  const answer = useCallback((choiceId: ChoiceId) => send({ type: "answered", choiceId }), [send]);

  /** 「わかった」を押したとき。とどめ問題の出し直しでは、正解の位置が変わるよう選択肢を並べ替えて渡す。 */
  const acknowledge = useCallback(() => {
    const current = stateRef.current;
    const question = currentQuestion(current);
    const retryOrder =
      question && current.slot >= 3
        ? reorderForRetry(current.choiceOrder, question.answer, Math.random)
        : undefined;
    send({ type: "acknowledged", retryOrder });
  }, [send]);

  /** 取得エラーで「もういちど」を押したとき。同じ条件でもう一度取得する。 */
  const retry = useCallback(() => {
    if (start) void load(start);
  }, [start, load]);

  /** 取得エラーで「ホームへ」を押したとき。 */
  const goHome = useCallback(() => router.replace("/"), [router]);

  return { state, answer, acknowledge, retry, goHome, goResult };
}
