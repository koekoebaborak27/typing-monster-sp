"use client";

import { BookOpen, Lock, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BOSSES, BossCircle, countDefeatedBosses } from "@/modules/boss";
import { isStorageAvailable, loadProgress, setSoundOn } from "@/modules/progress";
import type { Progress } from "@/modules/progress";
import { cn } from "@/shared/ui/utils";
import { REVENGE_UNLOCK_COUNT } from "../scoring";
import { useBattleSession } from "../session";
import { enableSound } from "../sound";
import type { BattleStart } from "../types";

/** 難易度ボタンの並び。「かんたん」だけを主ボタンにする（主ボタンは1画面に1つまで）。 */
const LEVELS = [
  { level: 1, label: "かんたん" },
  { level: 2, label: "ふつう" },
  { level: 3, label: "むずかしい" },
] as const;

/** ホームのタイトル横に出すボス。決まった1体を出す。 */
const HOME_BOSS = BOSSES.find((boss) => boss.id === "hatena-invader") ?? BOSSES[0];

/** 補助ボタン（枠だけのボタン）の共通のクラス。縦横44px以上を保つ。 */
const BUTTON_CLASS =
  "flex min-h-11 w-full flex-col items-center justify-center rounded-xl border border-border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none";

/** ホーム画面。保存データを読み、難易度・リベンジ・図鑑・音の切り替えを出す。 */
export function HomeScreen() {
  const router = useRouter();
  const { startBattle } = useBattleSession();
  // 保存データはブラウザでしか読めないので、画面を開いたあとに読む。読み込むまでは null。
  const [progress, setProgress] = useState<Progress | null>(null);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    // 読み込みはブラウザの localStorage に触るため、描画の中ではなく画面を開いた直後に行う。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setStorageOk(isStorageAvailable());
  }, []);

  /** 音をすぐ切り替えて保存する。 */
  function toggleSound() {
    if (!progress) return;
    const next = !progress.soundOn;
    setSoundOn(next);
    setProgress({ ...progress, soundOn: next });
    setStorageOk(isStorageAvailable());
  }

  /** バトルを始める。条件を BattleSession に置いて /battle へ移る。 */
  function start(condition: BattleStart) {
    // ブラウザの制限（タップ前は音を鳴らせない）のため、必ずこのタップの中で音を有効にする。
    enableSound();
    startBattle(condition);
    router.push("/battle");
  }

  const wrongCount = progress?.wrongIds.length ?? 0;
  // 読み込むまでは鍵のままにして、開放済みかどうかを誤って見せない。
  const revengeOpen = progress !== null && wrongCount >= REVENGE_UNLOCK_COUNT;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-2 p-4">
      {!storageOk && (
        <p role="status" className="rounded-xl bg-surface px-4 py-3 text-sm text-combo">
          きろくをほぞんできないよ。あそぶことはできるよ。
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggleSound}
          disabled={!progress}
          aria-pressed={progress?.soundOn ?? false}
          className="flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-sm text-fg-muted focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none"
        >
          {progress?.soundOn === false ? (
            <VolumeX aria-hidden="true" className="size-4" />
          ) : (
            <Volume2 aria-hidden="true" className="size-4" />
          )}
          {progress?.soundOn === false ? "音 OFF" : "音 ON"}
        </button>
      </div>

      <div className="mt-4">
        <BossCircle boss={HOME_BOSS} size="lg" />
      </div>
      <h1 className="text-center text-2xl font-medium">クイズモンスター</h1>
      <p className="mb-6 text-center text-fg-muted">3択に答えてボスをたおせ！</p>

      <p className="text-xs text-fg-muted">むずかしさをえらぶ</p>
      {LEVELS.map(({ level, label }) => (
        <button
          key={level}
          type="button"
          onClick={() => start({ mode: "normal", level })}
          className={cn(BUTTON_CLASS, level === 1 && "border-primary bg-primary text-white")}
        >
          {label}
        </button>
      ))}

      {revengeOpen ? (
        <button
          type="button"
          onClick={() => start({ mode: "revenge" })}
          className={cn(BUTTON_CLASS, "mt-4")}
        >
          リベンジモード
          <span className="text-sm text-fg-muted">まちがえた問題 {wrongCount}問</span>
        </button>
      ) : (
        // 開放前は押せない。点線の枠と鍵で示し、開放の条件を添える。
        <button
          type="button"
          disabled
          className={cn(BUTTON_CLASS, "mt-4 border-dashed text-fg-muted")}
        >
          <span className="flex items-center gap-1">
            <Lock aria-hidden="true" className="size-4" />
            リベンジモード
          </span>
          <span className="text-xs">
            まちがえた問題が{REVENGE_UNLOCK_COUNT}問たまると遊べるよ
            {progress && <>（いま {wrongCount}問）</>}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => router.push("/zukan")}
        className={cn(BUTTON_CLASS, "border-combo text-combo")}
      >
        <span className="flex items-center gap-1">
          <BookOpen aria-hidden="true" className="size-4" />
          ボス図鑑
          {progress && (
            <span className="ml-2">
              {countDefeatedBosses(
                progress.bossKills,
                BOSSES.map((boss) => boss.id),
              )}{" "}
              / {BOSSES.length}
            </span>
          )}
        </span>
      </button>
    </main>
  );
}
