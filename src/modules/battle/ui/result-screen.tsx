"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BossCircle } from "@/modules/boss";
import { cn } from "@/shared/ui/utils";
import { useBattleSession } from "../session";
import { getEvaluationView, getMissNote, getNoticeTexts } from "../view";

/** ボタンの共通のクラス。縦横44px以上を保つ。 */
const BUTTON_CLASS =
  "min-h-11 w-full rounded-xl border border-border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none";

/** 結果画面。BattleSession に置かれた結果を表示する。 */
export function ResultScreen() {
  const router = useRouter();
  const { result, startBattle } = useBattleSession();

  // 画面を開いたとき。結果が無ければ（URLを直接開いたとき等）ホームへ戻す。
  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  if (!result) return null;

  const evaluation = getEvaluationView(result.missCount);
  const notices = getNoticeTexts(result);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-2 p-4">
      <div className="mt-2">
        <BossCircle boss={result.boss} size="md" />
      </div>
      <h1 className="text-center text-2xl font-medium">{evaluation.title}</h1>
      {evaluation.stars !== null && (
        <p
          role="img"
          aria-label={`ほし${evaluation.stars}つ`}
          className="flex justify-center gap-1"
        >
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              aria-hidden="true"
              className={cn(
                "size-7",
                n <= (evaluation.stars ?? 0) ? "fill-finish text-finish" : "text-border",
              )}
            />
          ))}
        </p>
      )}
      <p className="text-center text-fg-muted">
        {result.boss.name}をたおした（{result.killCountAfter}回目）
      </p>

      {notices.map((text) => (
        <p key={text} className="rounded-xl border border-combo px-3 py-2 text-center text-finish">
          {text}
        </p>
      ))}

      {/* ミスの回数の欄。数字を大きく出し、一言で★3の条件（ミス0回ならパーフェクト）を伝える。 */}
      <section
        aria-label="ミスの回数"
        className="mt-4 rounded-xl bg-surface px-3 py-3.5 text-center"
      >
        <p className="text-sm text-fg-muted">ミスの回数</p>
        <p>
          <span className="text-3xl font-medium">{result.missCount}</span> 回
        </p>
        <p className="text-sm text-fg-muted">{getMissNote(result.missCount)}</p>
      </section>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            // 結果の「もう1回」。バトルを始めてよい印を付け直して /battle へ置き換える。
            startBattle();
            router.replace("/battle");
          }}
          className={cn(BUTTON_CLASS, "border-primary bg-primary text-white")}
        >
          もう1回
        </button>
        <button type="button" onClick={() => router.replace("/")} className={BUTTON_CLASS}>
          ホームへ
        </button>
      </div>
    </main>
  );
}
