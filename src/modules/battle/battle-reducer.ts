import type { Boss } from "@/modules/boss";
import type { Word } from "@/modules/word";
import { BOSS_MAX_HP, hpAfterFinishFirstHit, hpAfterNormalHit } from "./scoring";
import { judgeInput } from "./judge";
import type { BattleAction, BattleEffect, BattleState } from "./types";

/** 通常問題の数。`slot` がこれ未満なら通常問題、以上ならとどめ問題。 */
const NORMAL_COUNT = 3;

/** 最後の問題（とどめ問題の2問目）の `slot`。 */
const LAST_SLOT = 4;

/**
 * バトルを始めるときの状態を作る。
 * ボスと5語は、呼ぶ側が乱数を使って選んでから渡す（この関数の中では乱数を使わない）。
 */
export function createInitialState(boss: Boss, words: readonly Word[]): BattleState {
  return {
    phase: "typing",
    boss,
    words,
    slot: 0,
    hp: BOSS_MAX_HP,
    typedCount: 0,
    wrongText: "",
    needsJapaneseInput: false,
    missCount: 0,
    lastDamage: 0,
  };
}

/** 今のお題を返す。画面と reducer の両方で使う。 */
export function currentWord(state: BattleState): Word {
  return state.words[state.slot];
}

/**
 * お題を最後の文字まで打てたときの状態を作る。
 * 何問目かに応じてHPを減らし、ダメージ表示（最後の問題だけは、とどめの一撃）へ進める。
 */
function completeWord(state: BattleState, typedCount: number): BattleState {
  const typed = { ...state, typedCount, wrongText: "", needsJapaneseInput: false };

  // 最後の問題は、残りのHPをすべて減らして、とどめの一撃にする。
  if (state.slot === LAST_SLOT) {
    return { ...typed, phase: "finishing", hp: 0, lastDamage: state.hp };
  }

  // 通常問題は100、とどめ問題の1問目は残りHPの半分を減らす。
  const hp =
    state.slot < NORMAL_COUNT ? hpAfterNormalHit(state.hp) : hpAfterFinishFirstHit(state.hp);
  return { ...typed, phase: "damage", hp, lastDamage: state.hp - hp };
}

/**
 * 入力欄の中身が変わったときの状態を作る。
 * 中身の全体を今のお題と比べ、進める・ミスを数える・打ち終えた、のどれかにする。
 */
function changeInput(state: BattleState, value: string): BattleState {
  const target = currentWord(state).text;
  const result = judgeInput(target, value);

  if (result.missed) {
    return {
      ...state,
      typedCount: result.confirmed,
      // 正しく打てた所より後ろを、違う部分として持つ（画面で赤くする部分）。
      wrongText: value.slice(result.confirmed),
      needsJapaneseInput: result.tooManyLetters,
      // ミスを数えるのは、合っている状態から違っている状態に変わったときの1回だけ。
      // 違う文字が入力欄に残っている間（変える前の wrongText が空でない間）は、何を打っても増やさない。
      missCount: state.wrongText === "" ? state.missCount + 1 : state.missCount,
    };
  }

  // お題の最後の文字まで打てた。
  if (result.confirmed === target.length) return completeWord(state, result.confirmed);

  // 合っているが、まだ途中。
  return { ...state, typedCount: result.confirmed, wrongText: "", needsJapaneseInput: false };
}

/**
 * バトルの状態を変える。
 * 同じ入力なら必ず同じ結果を返し、画面・localStorage・タイマー・音には触れない。
 */
export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "inputChanged":
      // ダメージ表示・とどめの一撃の間に入った文字は判定しない（ミスにも数えない）。
      if (state.phase !== "typing") return state;
      return changeInput(state, action.value);
    case "damageShown":
      // ダメージ表示のとき以外に届いたものは無視する（待ちが二重に動いた場合など）。
      if (state.phase !== "damage") return state;
      // 次のお題へ進む。入力欄は空にするので、打てた文字数も0に戻す。
      return { ...state, phase: "typing", slot: state.slot + 1, typedCount: 0 };
  }
}

/**
 * 状態の変化に伴って実行すべき処理を、一覧にして返す。
 * 実行はしない。音を鳴らすかどうか（サウンドON/OFF）は、実行する側で判断する。
 */
export function listEffects(prev: BattleState, next: BattleState): BattleEffect[] {
  const effects: BattleEffect[] = [];

  // ミスの音は、ミスを数えたときだけ鳴らす。
  if (next.missCount > prev.missCount) effects.push({ type: "playSound", kind: "miss" });

  // 言葉を打ち終えたとき（入力待ちから、ダメージ表示・とどめの一撃へ進んだとき）の音。
  if (prev.phase === "typing" && next.phase !== "typing") {
    effects.push({ type: "playSound", kind: "complete" });
  }

  // 次のお題へ進むときだけ、入力欄を空にする。
  if (prev.phase === "damage" && next.phase === "typing") effects.push({ type: "clearInput" });

  // とどめの一撃になったときに1回だけ、撃破を記録する。ミスが0回ならパーフェクト。
  if (prev.phase !== "finishing" && next.phase === "finishing") {
    effects.push({
      type: "recordBattleWin",
      bossId: next.boss.id,
      isPerfect: next.missCount === 0,
    });
  }

  return effects;
}
