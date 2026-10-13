import type { Boss } from "@/modules/boss";
import type { ChoiceId, Question } from "@/modules/quiz";
import {
  BOSS_MAX_HP,
  MAX_LIFE,
  hpAfterFinishFirstHit,
  hpAfterNormalHit,
  isPerfect,
  lifeAfterMiss,
} from "./scoring";
import type { BattleAction, BattleEffect, BattleState, FinishQuestions } from "./types";

/** 通常問題の数。`slot` がこの値になったらとどめ問題に入る。 */
const NORMAL_COUNT = 3;

/** 最後の問題（とどめ2問目）の `slot`。 */
const LAST_SLOT = 4;

/** バトル開始前（読み込み中）の状態を作る。 */
export function createInitialState(): BattleState {
  return {
    phase: "loading",
    fetchError: null,
    questions: [],
    finishQuestions: null,
    boss: null,
    slot: 0,
    isRetry: false,
    choiceOrder: [],
    selectedChoiceId: null,
    hp: BOSS_MAX_HP,
    life: MAX_LIFE,
    combo: 0,
    normalWrong: [],
    reviewList: [],
    finishDamage: 0,
    lastDamage: 0,
  };
}

/**
 * いま出している問題を返す。無ければ null。
 * `slot` が 0〜2 なら出題APIの `questions[slot]`、3〜4 なら `finishQuestions[slot - 3]`。
 */
export function currentQuestion(state: BattleState): Question | null {
  if (state.slot < NORMAL_COUNT) return state.questions[state.slot] ?? null;
  return state.finishQuestions?.[state.slot - NORMAL_COUNT] ?? null;
}

/**
 * とどめ問題2問を決める。
 * 通常問題の間違い（間違えた順）を先に使い、足りない分を予備問題（1問目・2問目の順）で埋める。
 * 間違いが3問あっても、使うのは先頭の2問だけ。
 */
export function decideFinishQuestions(
  normalWrong: Question[],
  spares: Question[],
): FinishQuestions {
  const picked = [...normalWrong.slice(0, 2), ...spares].slice(0, 2);
  return [picked[0], picked[1]];
}

/** 問題の選択肢IDを、問題データの並びのまま取り出す。 */
function defaultOrder(question: Question | null): ChoiceId[] {
  return question ? question.choices.map((choice) => choice.id) : [];
}

/**
 * 次の問題へ進める。`slot` を1つ進め、出し直しをやめ、選択肢の並びを問題データの順に戻す。
 * 通常問題の最後（2）から3へ進むときは、ここでとどめ問題を決める。
 */
function advance(state: BattleState): BattleState {
  const slot = state.slot + 1;
  const finishQuestions =
    slot === NORMAL_COUNT
      ? decideFinishQuestions(state.normalWrong, state.questions.slice(3, 5))
      : state.finishQuestions;
  const next: BattleState = {
    ...state,
    phase: "answering",
    slot,
    isRetry: false,
    finishQuestions,
    selectedChoiceId: null,
  };
  return { ...next, choiceOrder: defaultOrder(currentQuestion(next)) };
}

/** 最初の解答が不正解だった問題を、ふりかえり用の一覧へ加える（すでにあれば加えない）。 */
function addToReview(reviewList: Question[], question: Question): Question[] {
  return reviewList.some((item) => item.id === question.id)
    ? reviewList
    : [...reviewList, question];
}

/** 選択肢を押したときの状態を作る。正解か不正解かで、HP・ライフ・コンボ・次の表示が変わる。 */
function answer(state: BattleState, choiceId: ChoiceId): BattleState {
  const question = currentQuestion(state);
  // 解答待ち以外、問題が無いとき、今の問題に無い選択肢は無視する。
  if (state.phase !== "answering" || !question) return state;
  if (!question.choices.some((choice) => choice.id === choiceId)) return state;

  const isFinish = state.slot >= NORMAL_COUNT;
  const base = { ...state, selectedChoiceId: choiceId };

  if (choiceId === question.answer) {
    // とどめ2問目に正解したら、ボスを倒す。大きく出すダメージは、倒す直前のHP。
    if (state.slot === LAST_SLOT) {
      return { ...base, phase: "finishing", finishDamage: state.hp, hp: 0, combo: state.combo + 1 };
    }
    const hp = isFinish ? hpAfterFinishFirstHit(state.hp) : hpAfterNormalHit(state.hp);
    return {
      ...base,
      phase: "correct",
      hp,
      // 画面に大きく出すため、減った分のHPをダメージとして覚えておく。
      lastDamage: state.hp - hp,
      combo: state.combo + 1,
    };
  }

  // 出し直し中の不正解は、ふりかえりに加えない（最初の解答で決まるため）。
  const reviewList = state.isRetry ? state.reviewList : addToReview(state.reviewList, question);
  if (isFinish) {
    // とどめ問題で間違えてもライフは減らさない。
    return { ...base, phase: "wrong", combo: 0, reviewList };
  }
  return {
    ...base,
    phase: "wrong",
    life: lifeAfterMiss(state.life),
    combo: 0,
    normalWrong: [...state.normalWrong, question],
    reviewList,
  };
}

/** 「わかった」を押したときの状態を作る。通常問題は次へ進み、とどめ問題は同じ問題を並べ替えて出し直す。 */
function acknowledge(state: BattleState, retryOrder?: ChoiceId[]): BattleState {
  if (state.phase !== "wrong") return state;
  if (state.slot < NORMAL_COUNT) return advance(state);
  return {
    ...state,
    phase: "answering",
    isRetry: true,
    selectedChoiceId: null,
    // 並べ替えが渡されなかったときは、今の並びのままにする（通常は呼ぶ側が必ず渡す）。
    choiceOrder: retryOrder ?? state.choiceOrder,
  };
}

/**
 * 操作を受け取って、次の状態を返す。同じ入力なら必ず同じ結果になる。
 * 今の状態では起こらない操作（例: 解答待ち以外での選択肢タップ）は、状態を変えずに返す。
 */
export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "fetchStarted":
      // 取得エラーからのやり直し。エラーの前は何も始まっていないので、最初の状態に戻す。
      return state.phase === "fetchError" ? createInitialState() : state;
    case "fetchSucceeded": {
      if (state.phase !== "loading") return state;
      const started: BattleState = {
        ...state,
        phase: "answering",
        fetchError: null,
        questions: action.questions,
        boss: action.boss,
        slot: 0,
      };
      return { ...started, choiceOrder: defaultOrder(currentQuestion(started)) };
    }
    case "fetchFailed":
      return state.phase === "loading"
        ? { ...state, phase: "fetchError", fetchError: action.fetchError }
        : state;
    case "answered":
      return answer(state, action.choiceId);
    case "correctShown":
      return state.phase === "correct" ? advance(state) : state;
    case "acknowledged":
      return acknowledge(state, action.retryOrder);
  }
}

/** 今回のボスを倒したときに保存する、勝利の記録を作る。ボスが決まっていなければ何も返さない。 */
function winEffect(boss: Boss | null, life: number): BattleEffect[] {
  return boss ? [{ type: "recordBattleWin", bossId: boss.id, isPerfect: isPerfect(life) }] : [];
}

/**
 * 状態が変わったときに実行すべき処理を、前後の状態を比べて列挙する。実行はしない。
 * 音・各問題の最初の解答の記録・勝利の記録を返す。
 */
export function listEffects(prev: BattleState, next: BattleState): BattleEffect[] {
  const effects: BattleEffect[] = [];
  const answered = prev.phase === "answering" && next.phase !== "answering";
  const question = currentQuestion(prev);

  if (answered && (next.phase === "correct" || next.phase === "finishing")) {
    effects.push({ type: "playSound", kind: "correct" });
  }
  if (answered && next.phase === "wrong") {
    effects.push({ type: "playSound", kind: "wrong" });
  }

  // 最初の解答だけ記録する。出し直しは対象外。
  // 通常問題で間違えた問題がとどめ問題で再び出たときも、最初の解答はすでに記録済みなので記録しない。
  if (
    answered &&
    question &&
    !prev.isRetry &&
    !prev.normalWrong.some((q) => q.id === question.id)
  ) {
    effects.push({
      type: "recordFirstAnswer",
      questionId: question.id,
      isCorrect: next.phase !== "wrong",
    });
  }

  // 勝利の記録は、とどめの一撃になった瞬間の1回だけ。
  if (prev.phase !== "finishing" && next.phase === "finishing") {
    effects.push(...winEffect(next.boss, next.life));
  }
  return effects;
}
