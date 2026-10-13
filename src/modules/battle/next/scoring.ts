/** ボスの最大HP。 */
export const BOSS_MAX_HP = 500;

/** 通常問題を打ち終えたときに与えるダメージ。 */
export const NORMAL_DAMAGE = 100;

/** 怒りモードになるミスの回数。この回数以上で、バトルの最後まで続く。 */
export const ANGRY_MISS_COUNT = 5;

/** 通常問題を打ち終えたあとのHPを返す。0未満にはしない。 */
export function hpAfterNormalHit(hp: number): number {
  return Math.max(0, hp - NORMAL_DAMAGE);
}

/**
 * とどめ1問目（4問目）を打ち終えたあとのHPを返す。残りHPの半分を減らす。
 * HPは100の倍数なので、半分も常に整数になる。
 */
export function hpAfterFinishFirstHit(hp: number): number {
  return hp - hp / 2;
}

/** パーフェクト勝利（ミスが 0 回）かを返す。 */
export function isPerfect(missCount: number): boolean {
  return missCount === 0;
}

/** 結果画面の評価。perfect=パーフェクト勝利 / win=勝利 / narrow=ギリギリ勝利。stars は塗る★の数。 */
export type Evaluation = { kind: "perfect" | "win" | "narrow"; stars: 0 | 1 | 2 | 3 };

/**
 * ミスの回数から結果の評価を決める。
 * 0 回ならパーフェクト勝利（★3）、1〜2 回なら勝利（★2）、3〜4 回なら勝利（★1）、5 回以上ならギリギリ勝利（★なし）。
 */
export function evaluate(missCount: number): Evaluation {
  if (missCount <= 0) return { kind: "perfect", stars: 3 };
  if (missCount <= 2) return { kind: "win", stars: 2 };
  if (missCount <= 4) return { kind: "win", stars: 1 };
  return { kind: "narrow", stars: 0 };
}
