import { getZukanNotice } from "@/modules/boss";
import type { BattleResult } from "./battle-result";
import { ANGRY_MISS_COUNT, BOSS_MAX_HP, evaluate, isPerfect } from "./scoring";
import type { BattlePhase } from "./types";

/** 怒りモードかを返す。ミスが 5 回以上になった時点から、バトルの最後まで続く。 */
export function isAngry(missCount: number): boolean {
  return missCount >= ANGRY_MISS_COUNT;
}

/** HPバーの幅（%）。HP 500 が満タンで、範囲外の値は 0〜100 に収める。 */
export function hpPercent(hp: number): number {
  return Math.min(100, Math.max(0, (hp / BOSS_MAX_HP) * 100));
}

/**
 * 進み具合バーの幅（%）。打ち終えた問題の数 / 5。
 * `slot` は 0 始まりで、入力待ちの間は `slot` 問、ダメージ表示・とどめの一撃では今の問題まで終えたので `slot + 1` 問。
 */
export function progressPercent(phase: BattlePhase, slot: number): number {
  const done = phase === "typing" ? slot : slot + 1;
  return (done / 5) * 100;
}

/**
 * HPの行の右に出す「とどめ問題」の札の文言。出さないときは null。
 * 4・5問目（`slot` 3・4）で、とどめの一撃の状態ではないときだけ出す。
 */
export function getFinishLabel(phase: BattlePhase, slot: number): string | null {
  if (phase === "finishing" || slot < 3) return null;
  return `とどめ問題 ${slot - 2}/2`;
}

/**
 * お題を「打てた文字」「次に打つ文字」「まだの文字」に分ける。
 * ダメージ表示・とどめの一撃では全部を打てた文字にする。
 */
export function splitTarget(
  reading: string,
  phase: BattlePhase,
  typedCount: number,
): { typed: string; next: string; rest: string } {
  if (phase !== "typing") return { typed: reading, next: "", rest: "" };
  return {
    typed: reading.slice(0, typedCount),
    next: reading.slice(typedCount, typedCount + 1),
    rest: reading.slice(typedCount + 1),
  };
}

/**
 * 入力欄の下に出す「知らせる文」。出さないときは null。
 * 日本語入力がオフと見なしたときはその案内、違う文字が残っているときはその1文字目を示して消すよう促す。
 */
export function getHintText(wrongText: string, needsJapaneseInput: boolean): string | null {
  if (needsJapaneseInput) return "にほんご入力を オンにしてね";
  if (wrongText === "") return null;
  return `「${wrongText.charAt(0)}」は ちがうよ。⌫ で けしてね`;
}

/** 結果画面の評価の見出しと、塗る★の数（★の行を出さないときは null）。 */
export function getEvaluationView(missCount: number): { title: string; stars: 1 | 2 | 3 | null } {
  const { kind, stars } = evaluate(missCount);
  if (kind === "perfect") return { title: "パーフェクト勝利！", stars: 3 };
  if (kind === "win") return { title: "勝利！", stars: stars === 2 ? 2 : 1 };
  // ミス5回以上のギリギリ勝利は、★の行を出さない。
  return { title: "ギリギリ勝利！", stars: null };
}

/** 結果画面の「ミスの回数」の欄の一言。ミスがあれば★3の条件、無ければパーフェクトを伝える。 */
export function getMissNote(missCount: number): string {
  return missCount >= 1 ? "ミス 0回で ★3つ！" : "パーフェクト！";
}

/**
 * 結果画面のお知らせ帯の文言を、表示する順（図鑑 → パーフェクト）に並べて返す。
 * 何も当てはまらなければ空の配列。
 */
export function getNoticeTexts(result: BattleResult): string[] {
  const texts: string[] = [];
  const zukan = getZukanNotice(result.killCountBefore);
  if (zukan?.kind === "new") texts.push("NEW！ボス図鑑に登録された！");
  if (zukan?.kind === "rankUp") {
    texts.push(`ランクアップ！ 枠が${zukan.rank === "gold" ? "金" : "銀"}になった`);
  }
  if (isPerfect(result.missCount)) texts.push(`パーフェクト勝利 ${result.perfectCount}回目！`);
  return texts;
}
