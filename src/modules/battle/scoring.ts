import type { Random } from "@/modules/boss";
import type { ChoiceId } from "@/modules/quiz";

/** ボスの最大HP。 */
export const BOSS_MAX_HP = 500;

/** 最初のライフ。 */
export const MAX_LIFE = 3;

/** リベンジモードを遊べるようになる「まちがえた問題」の数。 */
export const REVENGE_UNLOCK_COUNT = 5;

/** 通常問題の正解1問で与えるダメージ。 */
export const NORMAL_DAMAGE = 100;

/** 通常問題を正解したあとのHPを返す。0未満にはしない。 */
export function hpAfterNormalHit(hp: number): number {
  return Math.max(0, hp - NORMAL_DAMAGE);
}

/**
 * とどめ1問目を正解したあとのHPを返す。残りHPの半分を減らす。
 * HPは100の倍数なので、半分も常に整数になる。
 */
export function hpAfterFinishFirstHit(hp: number): number {
  return hp - hp / 2;
}

/** 不正解で減らしたあとのライフを返す。0未満にはしない（0になってもゲームオーバーにはしない）。 */
export function lifeAfterMiss(life: number): number {
  return Math.max(0, life - 1);
}

/** パーフェクト勝利（ライフを1つも減らしていない）かを返す。 */
export function isPerfect(life: number): boolean {
  return life === MAX_LIFE;
}

/** 結果画面の評価。perfect=パーフェクト勝利 / win=勝利 / narrow=ギリギリ勝利。 */
export type Evaluation = { kind: "perfect" | "win" | "narrow"; stars: 0 | 1 | 2 | 3 };

/**
 * 残りライフから結果の評価を決める。
 * 3 ならパーフェクト勝利（★3）、2 なら勝利（★2）、1 なら勝利（★1）、0 ならギリギリ勝利（★なし）。
 */
export function evaluate(life: number): Evaluation {
  if (life >= MAX_LIFE) return { kind: "perfect", stars: 3 };
  if (life === 2) return { kind: "win", stars: 2 };
  if (life === 1) return { kind: "win", stars: 1 };
  return { kind: "narrow", stars: 0 };
}

/** 選択肢IDの並びをランダムに入れ替えた新しい配列を返す（元の配列は変えない）。 */
function shuffle(order: ChoiceId[], random: Random): ChoiceId[] {
  const result = [...order];
  // 後ろから順に、手前のどこか（自分を含む）と入れ替える。
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 並べ替え直す回数の上限。乱数が偏っていても、ずっと同じ位置のまま止まらないようにする。 */
const MAX_RETRY_SHUFFLES = 100;

/**
 * とどめ問題の出し直しで、選択肢の並びを入れ替える。
 * 正解の選択肢の位置が前回と変わるまで、ランダムに並べ替え直す。
 * 乱数が偏って上限回数でも変わらなかったときは、全体を1つずらして必ず位置を変える。
 */
export function reorderForRetry(order: ChoiceId[], answerId: ChoiceId, random: Random): ChoiceId[] {
  const before = order.indexOf(answerId);
  for (let i = 0; i < MAX_RETRY_SHUFFLES; i++) {
    const next = shuffle(order, random);
    if (next.indexOf(answerId) !== before) return next;
  }
  // 1つずらすと、選択肢が2つ以上あれば正解の位置は必ず変わる。
  return [...order.slice(1), order[0]];
}
