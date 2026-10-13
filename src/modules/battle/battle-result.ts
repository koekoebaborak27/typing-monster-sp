import type { Boss } from "@/modules/boss";
import type { Progress } from "@/modules/progress";
import type { Question } from "@/modules/quiz";
import { REVENGE_UNLOCK_COUNT } from "./scoring";
import type { BattleResult, BattleStart } from "./types";

/**
 * 結果画面に出す値を組み立てる。
 * 撃破の記録を保存する前と後の保存データを渡し、その差から撃破回数などを求める。
 */
export function buildBattleResult(input: {
  start: BattleStart;
  boss: Boss;
  life: number;
  reviewList: Question[];
  before: Progress;
  after: Progress;
}): BattleResult {
  const { start, boss, life, reviewList, before, after } = input;
  return {
    start,
    boss,
    life,
    // まだ一度も倒していないボスは、保存データに項目が無いので 0 回として扱う。
    killCountBefore: before.bossKills[boss.id] ?? 0,
    killCountAfter: after.bossKills[boss.id] ?? 0,
    perfectCount: after.perfectCount,
    reviewList,
    // リベンジを遊び切ったかどうかは、更新後の「まちがえた問題」が開放の数を下回ったかで決める。
    revengeCleared: start.mode === "revenge" && after.wrongIds.length < REVENGE_UNLOCK_COUNT,
  };
}
