import { getRank } from "./rank";
import type { Boss, Rank } from "./types";

/** 図鑑に並べるボス1体分。撃破回数が 0 のときはランクが null で、シルエット表示になる。 */
export type ZukanEntry = { boss: Boss; killCount: number; rank: Rank | null };

/**
 * 図鑑に並べる順にボスを並べ替える。
 * 撃破済み（1回以上）を先頭にし、同じグループの中はボス一覧の順を保つ。
 * 保存データにボス一覧に無いIDの記録があっても、無視する（並びにも数にも入れない）。
 */
export function buildZukanEntries(
  bosses: readonly Boss[],
  bossKills: Record<string, number>,
): ZukanEntry[] {
  const entries = bosses.map((boss) => {
    const killCount = bossKills[boss.id] ?? 0;
    return { boss, killCount, rank: getRank(killCount) };
  });
  return [
    ...entries.filter((entry) => entry.killCount >= 1),
    ...entries.filter((entry) => entry.killCount < 1),
  ];
}
