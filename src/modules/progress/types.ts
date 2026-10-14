/**
 * localStorage に保存する全記録。
 * ボスIDはただの文字列として持つ。ボスの一覧に無いIDの扱い（選び方・図鑑での無視）は boss モジュールが受け持つ。
 */
export type Progress = {
  version: 1;
  /** 最近出た言葉のID。古い順で、最大 RECENT_LIMIT 件。 */
  recentIds: string[];
  lastBossId: string | null;
  bossKills: Record<string, number>;
  perfectCount: number;
  soundOn: boolean;
};
