"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadProgress, resetZukan } from "@/modules/progress";
import type { Progress } from "@/modules/progress";
import { cn } from "@/shared/ui/utils";
import { BOSSES } from "../data/bosses";
import { countDefeatedBosses } from "../rank";
import type { Rank } from "../types";
import { buildZukanEntries } from "../zukan";

/** ランクごとの枠の色のクラス。 */
const RANK_BORDER: Record<Rank, string> = {
  bronze: "border-bronze",
  silver: "border-silver",
  gold: "border-gold",
};

/** 下に出す色見本。枠の色が何回の撃破に当たるかを示す。 */
const LEGEND: { rank: Rank; label: string }[] = [
  { rank: "bronze", label: "1回" },
  { rank: "silver", label: "3回" },
  { rank: "gold", label: "5回" },
];

/** ボス図鑑の画面。倒したボスの枠・撃破回数、収集率、パーフェクト勝利の回数を出す。 */
export function BossZukanScreen() {
  const router = useRouter();
  // 保存データはブラウザでしか読めないので、画面を開いたあとに読む。読み込むまでは null。
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    // 読み込みはブラウザの localStorage に触るため、描画の中ではなく画面を開いた直後に行う。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  // 確認で「OK」が選ばれたときだけ図鑑を空にし、空になった記録を読み直して画面へ反映する。
  // 子どもの押し間違いで記録が消えないよう、必ず一度たずねる。
  function handleReset() {
    if (!window.confirm("図鑑を空にします。本当によろしいですか？")) return;
    resetZukan();
    setProgress(loadProgress());
  }

  const entries = buildZukanEntries(BOSSES, progress?.bossKills ?? {});
  const defeated = countDefeatedBosses(
    progress?.bossKills ?? {},
    BOSSES.map((boss) => boss.id),
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col p-4">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex min-h-11 items-center gap-1 rounded-xl pr-2 text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          もどる
        </button>
        <h1 className="text-base font-medium">ボス図鑑</h1>
        {/* 読み込むまでは収集率を出さない（0 / 20 と誤って見せないため）。 */}
        <span className="min-w-12 text-right text-base text-combo">
          {progress && `${defeated} / ${BOSSES.length}`}
        </span>
      </header>

      {progress && (
        <p className="mb-3 text-center text-xs text-fg-muted">
          パーフェクト勝利 {progress.perfectCount}回
        </p>
      )}

      <ul className="grid grid-cols-4 gap-2">
        {entries.map(({ boss, killCount, rank }) => (
          <li
            key={boss.id}
            className={cn(
              "flex flex-col items-center rounded-lg border-2 px-1 py-2 text-center text-xs",
              rank ? RANK_BORDER[rank] : "border-surface-2 bg-surface-2 text-bg",
            )}
          >
            {/* 未撃破は黒いシルエットにして、名前も「？？？」にする。 */}
            <span aria-hidden="true" className={cn("text-2xl", !rank && "brightness-0")}>
              {boss.emoji}
            </span>
            {rank ? (
              <>
                <span>{boss.name}</span>
                <span className="text-fg-muted">×{killCount}</span>
              </>
            ) : (
              <span aria-label="まだたおしていないボス">？？？</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-xs text-fg-muted">たおした回数で、わくの色がかわるよ</p>
      <ul className="mt-3 flex justify-center gap-3 text-xs">
        {LEGEND.map(({ rank, label }) => (
          <li key={rank} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className={cn("inline-block size-3 rounded-sm border-2", RANK_BORDER[rank])}
            />
            {label}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleReset}
        className="mx-auto mt-6 min-h-11 rounded-xl px-4 text-xs text-fg-muted underline focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none"
      >
        図鑑をリセット
      </button>
    </main>
  );
}
