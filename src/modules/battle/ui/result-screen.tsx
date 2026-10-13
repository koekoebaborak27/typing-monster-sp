"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BossCircle } from "@/modules/boss";
import { cn } from "@/shared/ui/utils";
import { useBattleSession } from "../session";
import { getEvaluationView, getNoticeTexts } from "../view";

/** ボタンの共通のクラス。縦横44px以上を保つ。 */
const BUTTON_CLASS =
  "min-h-11 w-full rounded-xl border border-border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none";

/** 結果画面。BattleSession に置かれた結果を表示し、次のバトルの先読みを始める。 */
export function ResultScreen() {
  const router = useRouter();
  const { result, prefetchNext, discardPrefetch } = useBattleSession();

  // 画面を開いたとき。結果が無ければ（URLを直接開いたとき等）ホームへ戻し、あれば次のバトルの問題を先読みする。
  useEffect(() => {
    if (!result) {
      router.replace("/");
      return;
    }
    prefetchNext(result);
  }, [result, prefetchNext, router]);

  if (!result) return null;

  const evaluation = getEvaluationView(result.life);
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

      {result.reviewList.length > 0 ? (
        <section className="mt-2 flex flex-col gap-2">
          <h2 className="text-xs text-fg-muted">ふりかえり（まちがえた問題）</h2>
          {result.reviewList.map((question) => (
            <div key={question.id} className="rounded-xl bg-surface px-3 py-3 leading-relaxed">
              <p>{question.question}</p>
              <p className="text-correct">
                正解：{question.choices.find((choice) => choice.id === question.answer)?.text}
              </p>
              <p className="text-sm text-fg-muted">{question.explanation}</p>
            </div>
          ))}
        </section>
      ) : (
        <p className="mt-2 text-center text-base">まちがいなし！</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {result.revengeCleared ? (
          <p className="text-center text-base text-combo">ぜんぶリベンジした！</p>
        ) : (
          // 同じ mode・level の開始情報と先読みはそのまま残っているので、バトル画面が取り出して使う。
          <button
            type="button"
            onClick={() => router.replace("/battle")}
            className={cn(BUTTON_CLASS, "border-primary bg-primary text-white")}
          >
            もう1回
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            // ホームへ戻るときは、先読みした問題を捨てる。
            discardPrefetch();
            router.replace("/");
          }}
          className={BUTTON_CLASS}
        >
          ホームへ
        </button>
      </div>
    </main>
  );
}
