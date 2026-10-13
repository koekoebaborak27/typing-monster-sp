import type { Rank, ZukanNotice } from "./types";

/**
 * 撃破回数から、図鑑の枠のランクを決める。
 * 0回は枠なし（null）、1〜2回は銅、3〜4回は銀、5回以上は金。
 */
export function getRank(killCount: number): Rank | null {
  if (killCount >= 5) return "gold";
  if (killCount >= 3) return "silver";
  if (killCount >= 1) return "bronze";
  return null;
}

/**
 * 結果画面のお知らせ帯（図鑑）に出す内容を決める。出さないときは null。
 * 引数は撃破回数を増やす前の値。増やした後は「前 + 1」として扱う。
 */
export function getZukanNotice(killCountBefore: number): ZukanNotice | null {
  const before = getRank(killCountBefore);
  const after = getRank(killCountBefore + 1);

  // 初めて倒したときは、ランクが「なし」から「銅」に変わるが、ランクアップではなく新規登録として扱う。
  if (before === null) return { kind: "new" };
  // 枠の色が変わったときだけ知らせる。銅になるのは新規登録のときだけなので、ここで来る色は銀か金。
  if (after !== before && after !== null && after !== "bronze")
    return { kind: "rankUp", rank: after };
  return null;
}

/**
 * 撃破済み（1回以上倒した）ボスの数を数える。ホームと図鑑の収集率に使う。
 * 保存データにボス一覧に無いIDが残っていても、数に入れない。
 */
export function countDefeatedBosses(
  bossKills: Record<string, number>,
  bossIds: readonly string[],
): number {
  return bossIds.filter((id) => (bossKills[id] ?? 0) >= 1).length;
}
