import type { Boss } from "@/modules/boss";

/**
 * 結果画面に出す値。バトルが「とどめの一撃」になったときに作り、BattleSession に置く。
 * 項目の意味は基本設計「結果画面の表示」の「結果の作り方」の表のとおり。
 */
export type BattleResult = {
  /** 倒したボス。 */
  boss: Boss;
  /** ミスの回数（評価の基準）。 */
  missCount: number;
  /** 撃破回数（更新の前と後）。 */
  killCountBefore: number;
  killCountAfter: number;
  /** パーフェクト勝利の更新後の回数。 */
  perfectCount: number;
};

/**
 * 結果画面に出す値を組み立てる。
 * 撃破の記録を保存する前と後の撃破回数・パーフェクトの回数は、呼ぶ側が保存データから読んで渡す
 * （保存データの形に依存しないよう、ここでは数字だけを受け取る）。
 */
export function buildBattleResult(input: BattleResult): BattleResult {
  return { ...input };
}
