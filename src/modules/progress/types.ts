/** 難易度。出題モジュールに依存せず保存データの型を表す。 */
export type Level = 1 | 2 | 3;

/**
 * localStorage に保存する全記録。
 * ボスIDはただの文字列として持つ。ボスの一覧に無いIDの扱い（選び方・図鑑での無視）は boss モジュールが受け持つ。
 */
export type Progress = {
  version: 1;
  wrongIds: string[];
  recentIds: Record<Level, string[]>;
  lastBossId: string | null;
  bossKills: Record<string, number>;
  perfectCount: number;
  soundOn: boolean;
};
