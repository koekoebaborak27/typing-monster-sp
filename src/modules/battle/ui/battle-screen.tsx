"use client";

import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import { BossCircle } from "@/modules/boss";
import type { ChoiceId, Question } from "@/modules/quiz";
import { cn } from "@/shared/ui/utils";
import { currentQuestion } from "../battle-reducer";
import { BOSS_MAX_HP, MAX_LIFE } from "../scoring";
import type { BattleState, FetchErrorKind } from "../types";
import { getChoiceStatus, hpPercent, progressPercent } from "../view";
import type { ChoiceStatus } from "../view";
import { useBattle } from "./use-battle";

/** 取得エラーごとの文言と、「もういちど」を出すか。 */
const FETCH_ERROR_VIEW: Record<FetchErrorKind, { message: string; canRetry: boolean }> = {
  offline: { message: "インターネットにつないでね", canRetry: true },
  failed: { message: "もんだいをよみこめなかったよ。もういちどためしてね。", canRetry: true },
  revengeUnavailable: { message: "リベンジできるもんだいがなくなったよ", canRetry: false },
};

/** 選択肢の見た目の種類ごとのクラス。 */
const CHOICE_CLASS: Record<ChoiceStatus, string> = {
  default: "border border-border",
  correct: "border-2 border-correct bg-correct-bg text-correct",
  wrong: "border border-wrong text-wrong",
  faded: "border border-border opacity-45",
};

/** 画面の外枠。怒りモードのときだけ背景を変える。 */
function Frame({ angry, children }: { angry: boolean; children: ReactNode }) {
  return (
    <main className={cn("min-h-dvh", angry ? "bg-angry-bg" : "bg-bg")}>
      <div className="mx-auto flex max-w-md flex-col p-4">{children}</div>
    </main>
  );
}

/** 画面の下に並べる補助ボタン（枠だけ）の共通のクラス。 */
const SUB_BUTTON_CLASS =
  "min-h-11 w-full rounded-xl border border-border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none";

/** バトル画面。状態の描画と操作の受け渡しだけを行い、進行は useBattle に任せる。 */
export function BattleScreen() {
  const { state, answer, acknowledge, retry, goHome, goResult } = useBattle();

  if (state.phase === "loading") {
    return (
      <Frame angry={false}>
        <p role="status" className="mt-40 text-center text-fg-muted">
          よみこみ中…
        </p>
      </Frame>
    );
  }

  if (state.phase === "fetchError" && state.fetchError) {
    const { message, canRetry } = FETCH_ERROR_VIEW[state.fetchError];
    return (
      <Frame angry={false}>
        <p role="alert" className="mt-32 mb-8 text-center text-base">
          {message}
        </p>
        <div className="flex flex-col gap-2">
          {canRetry && (
            <button
              type="button"
              onClick={retry}
              className={cn(SUB_BUTTON_CLASS, "border-primary bg-primary text-white")}
            >
              もういちど
            </button>
          )}
          <button type="button" onClick={goHome} className={SUB_BUTTON_CLASS}>
            ホームへ
          </button>
        </div>
      </Frame>
    );
  }

  return (
    <BattleBody state={state} onAnswer={answer} onAcknowledge={acknowledge} onResult={goResult} />
  );
}

/** バトル中（解答待ち・正解表示・不正解表示・とどめの一撃）の画面。 */
function BattleBody({
  state,
  onAnswer,
  onAcknowledge,
  onResult,
}: {
  state: BattleState;
  onAnswer: (choiceId: ChoiceId) => void;
  onAcknowledge: () => void;
  onResult: () => void;
}) {
  const { boss, phase } = state;
  const question = currentQuestion(state);
  if (!boss || !question) return null;

  // ライフが0のあいだは怒りモード（ライフが0になった問題の解説を出している間から始まる）。
  const angry = state.life === 0;
  const isFinishing = phase === "finishing";
  const isWrong = phase === "wrong";
  // とどめ問題は slot が 3・4。とどめの一撃の演出中は札を出さない。
  const showFinishTag = state.slot >= 3 && !isFinishing;
  // 選択肢はとどめの一撃の間、選んだ1つだけを残す。
  const choiceIds = isFinishing
    ? state.choiceOrder.filter((id) => id === state.selectedChoiceId)
    : state.choiceOrder;

  return (
    <Frame angry={angry}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-muted">{state.slot + 1} / 5問</span>
        <Lives life={state.life} />
      </div>

      <div className="relative mt-2">
        {angry && !isFinishing && (
          <p className="absolute top-0 right-0 z-10 rounded-xl bg-white px-3 py-1 text-xs font-medium text-boss-angry">
            もうゆるさないぞ！
          </p>
        )}
        <div className="mt-2">
          <BossCircle boss={boss} size={isWrong ? "sm" : "lg"} angry={angry} dimmed={isFinishing} />
        </div>
        {phase === "correct" && (
          // 正解したときのダメージ。問題ごとに作り直して、毎回はじめから動かす。
          <div
            key={state.slot}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <span
              aria-hidden="true"
              className="animate-damage-pop text-5xl leading-none font-bold whitespace-nowrap text-finish [text-shadow:0_0_12px_var(--color-hp),0_3px_0_var(--color-hp),0_0_2px_#000]"
            >
              {state.lastDamage}ダメージ！
            </span>
          </div>
        )}
        {isFinishing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-combo">とどめの一撃！</span>
            <span className="text-6xl leading-none font-medium text-finish">
              {state.finishDamage}
            </span>
          </div>
        )}
      </div>

      <p className={cn("mt-2 mb-2 text-center text-base font-medium", angry && "text-wrong")}>
        {angry ? `いかりの${boss.name}` : boss.name}
      </p>

      <div
        className="h-3 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-label="ボスのHP"
        aria-valuemin={0}
        aria-valuemax={BOSS_MAX_HP}
        aria-valuenow={state.hp}
      >
        <div
          className="h-full bg-hp transition-[width] duration-500"
          style={{ width: `${hpPercent(state.hp)}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-fg-muted">
          HP {state.hp} / {BOSS_MAX_HP}
        </span>
        <span className="flex items-center gap-2">
          {state.combo >= 2 && <span className="text-combo">{state.combo}コンボ！</span>}
          {showFinishTag && (
            <span className="rounded-md bg-combo px-2 py-0.5 text-xs text-bg">
              とどめ問題 {state.slot - 2}/2
            </span>
          )}
        </span>
      </div>

      <div className="mt-2 mb-3 h-1 overflow-hidden rounded-full bg-track">
        <div className="h-full bg-primary" style={{ width: `${progressPercent(state.slot)}%` }} />
      </div>

      {!isFinishing && (
        <>
          {state.isRetry && <p className="mb-1 text-xs text-combo">もういちど こたえてね</p>}
          <p className="mb-3 text-lg font-medium">{question.question}</p>
        </>
      )}

      <div className="flex flex-col gap-2">
        {choiceIds.map((id) => (
          <Choice
            key={id}
            question={question}
            choiceId={id}
            label={"ABC"[state.choiceOrder.indexOf(id)]}
            status={getChoiceStatus(phase, id, state.selectedChoiceId, question.answer)}
            selected={id === state.selectedChoiceId}
            disabled={phase !== "answering"}
            onSelect={onAnswer}
          />
        ))}
      </div>

      {isFinishing && (
        <button
          type="button"
          onClick={onResult}
          className={cn(SUB_BUTTON_CLASS, "mt-3 border-primary bg-primary text-white")}
        >
          けっかをみる
        </button>
      )}

      {phase === "answering" && state.slot === 3 && !state.isRetry && (
        // とどめ問題に入った合図。画面全体に出して、動きが終わると自然に消える。触っても邪魔にならない。
        <div
          key="finish-banner"
          aria-hidden="true"
          className="animate-finish-banner pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <span className="text-[min(12vw,4.5rem)] font-black whitespace-nowrap text-finish [text-shadow:0_0_20px_var(--color-hp),0_4px_0_var(--color-hp),0_0_3px_#000]">
            とどめをさせ！
          </span>
        </div>
      )}

      {isFinishing && (
        // ボスを倒した合図。画面全体に出して、動きが終わると自然に消える。触っても邪魔にならない。
        <div
          key="victory-banner"
          aria-hidden="true"
          className="animate-finish-banner pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <span className="text-[min(14vw,5rem)] font-black whitespace-nowrap text-finish [text-shadow:0_0_20px_var(--color-hp),0_4px_0_var(--color-hp),0_0_3px_#000]">
            ボス撃破！
          </span>
        </div>
      )}

      {isWrong && (
        <>
          <div className="my-2 rounded-xl bg-surface px-3 py-3 leading-relaxed">
            <p className="text-xs text-combo">ひっかけポイント</p>
            <p className="text-sm">{question.explanation}</p>
          </div>
          <button
            type="button"
            onClick={onAcknowledge}
            className={cn(SUB_BUTTON_CLASS, "border-primary bg-primary text-white")}
          >
            わかった
          </button>
        </>
      )}
    </Frame>
  );
}

/** ライフ。ハート3つのうち、残りの数だけ塗り、減った分は枠だけにする。 */
function Lives({ life }: { life: number }) {
  return (
    <span role="img" aria-label={`ライフ ${life}`} className="flex gap-1 text-life">
      {Array.from({ length: MAX_LIFE }, (_, i) => (
        <Heart
          key={i}
          aria-hidden="true"
          className={cn("size-5", i < life ? "fill-current" : "text-border")}
        />
      ))}
    </span>
  );
}

/** 選択肢1つ。左に A / B / C のラベル、正解・不正解のときは右端に「せいかい」「✕」を出す。 */
function Choice({
  question,
  choiceId,
  label,
  status,
  selected,
  disabled,
  onSelect,
}: {
  question: Question;
  choiceId: ChoiceId;
  label: string;
  status: ChoiceStatus;
  selected: boolean;
  disabled: boolean;
  onSelect: (choiceId: ChoiceId) => void;
}) {
  const text = question.choices.find((choice) => choice.id === choiceId)?.text;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(choiceId)}
      className={cn(
        "flex min-h-11 items-center gap-4 rounded-xl px-4 py-3 text-left text-base focus-visible:ring-2 focus-visible:ring-label focus-visible:outline-none",
        CHOICE_CLASS[status],
      )}
    >
      <span className={cn("font-medium", status === "default" ? "text-label" : "text-inherit")}>
        {label}
      </span>
      <span>{text}</span>
      {status === "correct" && <span className="ml-auto shrink-0 text-sm">せいかい</span>}
      {status === "wrong" && selected && <span className="ml-auto shrink-0">✕</span>}
    </button>
  );
}
