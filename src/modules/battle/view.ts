import type { ChoiceId } from "@/modules/quiz";
import { getZukanNotice } from "@/modules/boss";
import { BOSS_MAX_HP, evaluate, isPerfect } from "./scoring";
import type { BattlePhase, BattleResult } from "./types";

/** 選択肢の見た目の種類。通常・正解（緑）・選んだ不正解（赤）・薄くする。 */
export type ChoiceStatus = "default" | "correct" | "wrong" | "faded";

/**
 * 選択肢1つの見た目を決める。
 * 正解表示では選んだ選択肢だけを緑にし、不正解表示では選んだ選択肢を赤・正解を緑・残りを薄くする。
 */
export function getChoiceStatus(
  phase: BattlePhase,
  choiceId: ChoiceId,
  selectedId: ChoiceId | null,
  answerId: ChoiceId,
): ChoiceStatus {
  if (phase === "correct" || phase === "finishing") {
    return choiceId === selectedId ? "correct" : "default";
  }
  if (phase === "wrong") {
    if (choiceId === selectedId) return "wrong";
    return choiceId === answerId ? "correct" : "faded";
  }
  return "default";
}

/** HPバーの幅（%）。HP 500 が満タンで、範囲外の値は 0〜100 に収める。 */
export function hpPercent(hp: number): number {
  return Math.min(100, Math.max(0, (hp / BOSS_MAX_HP) * 100));
}

/** 進み具合バーの幅（%）。`slot` は0始まりなので、いま解いている問題まで進んだ分を出す。出し直しでは変わらない。 */
export function progressPercent(slot: number): number {
  return ((slot + 1) / 5) * 100;
}

/** 結果画面の評価の見出しと、塗る星の数（星の行を出さないときは null）。 */
export function getEvaluationView(life: number): { title: string; stars: 1 | 2 | 3 | null } {
  const { kind, stars } = evaluate(life);
  if (kind === "perfect") return { title: "パーフェクト勝利！", stars: 3 };
  if (kind === "win") return { title: "勝利！", stars: stars === 2 ? 2 : 1 };
  // ライフ0のギリギリ勝利は、★の行を出さない。
  return { title: "ギリギリ勝利！", stars: null };
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
  if (isPerfect(result.life)) texts.push(`パーフェクト勝利 ${result.perfectCount}回目！`);
  return texts;
}
