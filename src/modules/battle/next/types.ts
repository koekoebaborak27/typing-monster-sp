import type { Boss } from "@/modules/boss";
import type { Word } from "@/modules/word";

/** バトル画面の状態。入力待ち・ダメージ表示・とどめの一撃。 */
export type BattlePhase = "typing" | "damage" | "finishing";

/** バトル画面が持つ状態。設計書「バトル進行の処理の分け方」の「状態の型」に対応する。 */
export type BattleState = {
  phase: BattlePhase;
  /** 今回のボス。 */
  boss: Boss;
  /** お題の5語。この順に出す。 */
  words: readonly Word[];
  /** 何問目か（0〜4）。0〜2が通常問題、3〜4がとどめ問題。 */
  slot: number;
  /** ボスの残りHP。 */
  hp: number;
  /** 今のお題を、先頭から何文字目まで正しく打てたか。 */
  typedCount: number;
  /** 入力欄に残っている、お題と違う部分。空なら「合っている」。 */
  wrongText: string;
  /** 日本語入力がオフのまま打っていると見なしたか。 */
  needsJapaneseInput: boolean;
  /** ミスの回数（1バトルの通算。問題が変わっても引き継ぐ）。 */
  missCount: number;
  /** 直前に与えたダメージ。ダメージの表示に使う。 */
  lastDamage: number;
};

/**
 * バトル画面への操作。
 * inputChanged は入力欄の中身が変わったとき（value は中身の全体）、damageShown はダメージ表示から約1秒たったとき。
 */
export type BattleAction = { type: "inputChanged"; value: string } | { type: "damageShown" };

/** 状態の変化に伴って実行する処理。`listEffects` が列挙し、バトル画面用のフックが実行する。 */
export type BattleEffect =
  | { type: "playSound"; kind: "miss" | "complete" }
  | { type: "clearInput" }
  | { type: "recordBattleWin"; bossId: string; isPerfect: boolean };
