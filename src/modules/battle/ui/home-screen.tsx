"use client";

import { BookOpen, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BOSSES, BossCircle, countDefeatedBosses } from "@/modules/boss";
import { isStorageAvailable, loadProgress, setSoundOn } from "@/modules/progress";
import type { Progress } from "@/modules/progress";
import { cn } from "@/shared/ui/utils";
import { useBattleSession } from "../session";
import { enableSound } from "../sound";

/** ホームのタイトル横に出すボス。決まった1体を出す。 */
const HOME_BOSS = BOSSES.find((boss) => boss.id === "keyin-invader") ?? BOSSES[0];

/** 補助ボタン（枠だけのボタン）の共通のクラス。縦横44px以上を保つ。 */
const BUTTON_CLASS =
  "flex min-h-11 w-full flex-col items-center justify-center rounded-xl border border-border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none";

/** ホーム画面。保存データを読み、バトル開始・図鑑・音の切り替えを出す。 */
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

  /** バトルを始める。バトルを始めてよい印を BattleSession に付けて /battle へ移る。 */
  function start() {
    // ブラウザの制限（タップ前は音を鳴らせない）のため、必ずこのタップの中で音を有効にする。
    enableSound();
    startBattle();
    router.push("/battle");
  }

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
          // 文言が「音 ON」「音 OFF」で状態を表すので、押された状態の印（aria-pressed）は付けない。
          disabled={!progress}
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

      {/* モックどおり、音のボタンとボスの丸の間・一言とボタンの間を広めに空ける。 */}
      <div className="mt-10">
        <BossCircle boss={HOME_BOSS} size="lg" />
      </div>
      <h1 className="text-center text-2xl font-medium">タイピングモンスター</h1>
      <p className="mb-10 text-center text-fg-muted">ひらがなを うって ボスをたおせ！</p>

      <button
        type="button"
        onClick={start}
        className={cn(BUTTON_CLASS, "border-primary bg-primary py-4 text-lg text-white")}
      >
        バトル スタート
      </button>

      <button
        type="button"
        onClick={() => router.push("/zukan")}
        className={cn(BUTTON_CLASS, "mt-4 border-combo text-combo")}
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
