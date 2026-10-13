import type { Boss } from "@/modules/boss";
import type { ChoiceId, Level, Question } from "@/modules/quiz";

/** 次に始めるバトルの条件。通常モードは難易度つき、リベンジモードは難易度なし。 */
export type BattleStart = { mode: "normal"; level: Level } | { mode: "revenge" };

/** バトル画面の状態。読み込み中・解答待ち・正解表示・不正解表示・とどめの一撃・取得エラー。 */
export type BattlePhase =
  "loading" | "answering" | "correct" | "wrong" | "finishing" | "fetchError";

/** 取得エラーの種類。画面に出す文言とボタンを切り替えるために使う。 */
export type FetchErrorKind = "offline" | "failed" | "revengeUnavailable";

/** とどめ問題の2問。 */
export type FinishQuestions = [Question, Question];

/** バトル画面が持つ状態。設計書「バトル進行の処理の分け方」の「状態の型」に対応する。 */
export type BattleState = {
  phase: BattlePhase;
  fetchError: FetchErrorKind | null;
  /** 出題APIが返した5問（通常3問＋予備2問）。読み込み中は空。 */
  questions: Question[];
  /** とどめ問題2問。`slot` が 2 から 3 へ進むときに決める。 */
  finishQuestions: FinishQuestions | null;
  boss: Boss | null;
  /** 何問目か（0〜4）。0〜2が通常問題、3〜4がとどめ問題。 */
  slot: number;
  /** とどめ問題の出し直しか。 */
  isRetry: boolean;
  /** 選択肢IDの並び。画面のA・B・Cに順に当てる。 */
  choiceOrder: ChoiceId[];
  /** 直前に選んだ選択肢。正解表示・不正解表示で色を付けるために使う。 */
  selectedChoiceId: ChoiceId | null;
  hp: number;
  life: number;
  combo: number;
  /** 通常問題で間違えた問題（間違えた順）。 */
  normalWrong: Question[];
  /** 結果画面の「ふりかえり」に出す問題（最初の解答が不正解だった問題、間違えた順）。 */
  reviewList: Question[];
  /** とどめの一撃で出す大きな数字（2問目に正解する直前の `hp`）。 */
  finishDamage: number;
  /** 直前の正解で与えたダメージ（とどめの一撃以外）。正解表示のときにボスの前へ出す。 */
  lastDamage: number;
};

/** バトル画面への操作。 */
export type BattleAction =
  | { type: "fetchStarted" }
  | { type: "fetchSucceeded"; questions: Question[]; boss: Boss }
  | { type: "fetchFailed"; fetchError: FetchErrorKind }
  | { type: "answered"; choiceId: ChoiceId }
  | { type: "correctShown" }
  | { type: "acknowledged"; retryOrder?: ChoiceId[] };

/** 状態の変化に伴って実行する処理。`listEffects` が列挙し、バトル画面用のフックが実行する。 */
export type BattleEffect =
  | { type: "playSound"; kind: "correct" | "wrong" }
  | { type: "recordFirstAnswer"; questionId: string; isCorrect: boolean }
  | { type: "recordBattleWin"; bossId: string; isPerfect: boolean };

/**
 * 結果画面に出す値。バトルが「とどめの一撃」になったときに作り、BattleSession に置く。
 * 項目の意味は基本設計「結果画面の表示」の「結果の作り方」の表のとおり。
 */
export type BattleResult = {
  /** 「もう1回」で同じ条件にするために持つ（mode・level）。 */
  start: BattleStart;
  boss: Boss;
  /** 残りライフ（評価の基準）。 */
  life: number;
  /** 撃破回数（更新の前と後）。 */
  killCountBefore: number;
  killCountAfter: number;
  /** パーフェクト勝利の更新後の回数。 */
  perfectCount: number;
  /** ふりかえりに出す問題。 */
  reviewList: Question[];
  /** リベンジモードで、更新後の「まちがえた問題」が5問未満になったか。通常モードは常に false。 */
  revengeCleared: boolean;
};
