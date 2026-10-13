import { BOSSES } from "./data/bosses";
import type { Boss, Random } from "./types";

/**
 * バトルで戦うボスを1体選ぶ。
 * 直前のボス以外から、等しい確率で選ぶ。直前のボスが無い（初回）か、一覧に無いIDなら、全ボスから選ぶ。
 * 乱数は引数で受け取る（画面や localStorage には触れない純粋関数にして、テストで結果を固定できるようにするため）。
 */
export function pickBoss(lastBossId: string | null, random: Random): Boss {
  // 一覧に無いIDや null は、どのボスとも一致せず1体も除かれないので、20体から選ぶことになる。
  const candidates = BOSSES.filter((boss) => boss.id !== lastBossId);
  return candidates[Math.floor(random() * candidates.length)];
}
