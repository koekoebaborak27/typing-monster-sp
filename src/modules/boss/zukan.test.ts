/**
 * 対象: boss/zukan（buildZukanEntries）
 * 目的: 図鑑の並び（撃破済みが先頭、同じグループは一覧の順）とランクの付き方を担保する
 */
import { describe, it, expect } from "vitest";
import { buildZukanEntries } from "./zukan";

const bosses = [
  { id: "a", emoji: "A", name: "あ" },
  { id: "b", emoji: "B", name: "い" },
  { id: "c", emoji: "C", name: "う" },
  { id: "d", emoji: "D", name: "え" },
];

describe("buildZukanEntries", () => {
  it("撃破済みを先頭にし、各グループの中は一覧の順を保つ", () => {
    const entries = buildZukanEntries(bosses, { d: 1, b: 3 });
    expect(entries.map((entry) => entry.boss.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("撃破回数とランク（0回はなし・1回は銅・3回は銀・5回は金）を付ける", () => {
    const entries = buildZukanEntries(bosses, { a: 1, b: 3, c: 5 });
    expect(entries.map((entry) => [entry.killCount, entry.rank])).toEqual([
      [1, "bronze"],
      [3, "silver"],
      [5, "gold"],
      [0, null],
    ]);
  });

  it("一覧に無いIDの記録は無視し、20体ぶんの数は変わらない", () => {
    const entries = buildZukanEntries(bosses, { zzz: 9 });
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.rank === null)).toBe(true);
  });
});
