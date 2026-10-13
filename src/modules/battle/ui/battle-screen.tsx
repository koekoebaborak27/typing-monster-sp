"use client";

import type { RefObject } from "react";
import { BossCircle } from "@/modules/boss";
import { cn } from "@/shared/ui/utils";
import { currentWord } from "../battle-reducer";
import { BOSS_MAX_HP } from "../scoring";
import type { BattleState } from "../types";
import {
  getFinishLabel,
  getHintText,
  hpPercent,
  isAngry,
  progressPercent,
  splitTarget,
} from "../view";
import { useBattle } from "./use-battle";

/** バトル画面。状態の描画と入力欄の通知の受け渡しだけを行い、進行は useBattle に任せる。 */
export function BattleScreen() {
  const { state, inputValue, inputRef, changeInput } = useBattle();

  // ボスと5語を選ぶまでの一瞬は、背景だけを出す。
  if (!state) return <main className="min-h-dvh bg-bg" />;

  const angry = isAngry(state.missCount);
  const { boss, phase } = state;
  const isFinishing = phase === "finishing";
  const finishLabel = getFinishLabel(phase, state.slot);
  const target = splitTarget(currentWord(state).text, phase, state.typedCount);
  const hint = getHintText(state.wrongText, state.needsJapaneseInput);

  return (
    <main className={cn("min-h-dvh", angry ? "bg-angry-bg" : "bg-bg")}>
      <div className="mx-auto flex max-w-md flex-col p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted">{state.slot + 1} / 5問</span>
          <span className={state.missCount >= 1 ? "text-life" : "text-fg-muted"}>
            ミス {state.missCount}回
          </span>
        </div>

        <div className="relative mt-2">
          {angry && (
            <p className="absolute top-0 left-0 z-10 rounded-xl bg-white px-3 py-1 text-xs font-medium text-boss-angry">
              もうゆるさないぞ！
            </p>
          )}
          <BossCircle boss={boss} size="sm" angry={angry} dimmed={isFinishing} />
          <DamageDisplay state={state} />
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
          {finishLabel && (
            <span className="rounded-md bg-combo px-2 py-0.5 text-xs text-bg">{finishLabel}</span>
          )}
        </div>

        <div className="mt-2 mb-3 h-1 overflow-hidden rounded-full bg-track">
          <div
            className="h-full bg-primary"
            style={{ width: `${progressPercent(phase, state.slot)}%` }}
          />
        </div>

        {/* お題。打てた文字は緑、次に打つ文字には下線を付ける。 */}
        <p
          className="mb-2 text-center text-3xl font-medium tracking-[0.2em]"
          aria-label={currentWord(state).text}
        >
          <span className="text-correct">{target.typed}</span>
          <span className="underline decoration-label underline-offset-8">{target.next}</span>
          <span>{target.rest}</span>
        </p>

        <TypingInput state={state} value={inputValue} inputRef={inputRef} onChange={changeInput} />

        {/* 知らせる文。出ていないときも高さを取っておき、出たときに画面がずれないようにする。 */}
        <p role="status" className="mt-2 min-h-6 text-base text-wrong">
          {hint}
        </p>
      </div>
    </main>
  );
}

/** ボスの丸に重ねるダメージの表示。ダメージ表示では「100ダメージ！」、とどめの一撃ではその上に「とどめの一撃！」を足す。 */
function DamageDisplay({ state }: { state: BattleState }) {
  if (state.phase === "typing") return null;

  if (state.phase === "finishing") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
        <span className="text-xs text-combo">とどめの一撃！</span>
        <span className="text-3xl leading-tight font-medium whitespace-nowrap text-finish">
          {state.lastDamage}
          <span className="text-lg">ダメージ！</span>
        </span>
      </div>
    );
  }

  return (
    // 問題ごとに作り直して、毎回はじめから動かす。
    <div
      key={state.slot}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <span
        aria-hidden="true"
        className="animate-damage-pop text-3xl leading-none font-bold whitespace-nowrap text-finish [text-shadow:0_0_12px_var(--color-hp),0_3px_0_var(--color-hp),0_0_2px_#000]"
      >
        {state.lastDamage}ダメージ！
      </span>
    </div>
  );
}

/**
 * 入力欄。本物の入力欄は透明にして上に重ね、下に同じ文字を色分けして出す（違う部分だけを赤くするため）。
 * 入力欄の中身は入力欄が持ち、画面からは書き換えない（変換中の文字をキーボードが覚えているため）。
 */
function TypingInput({
  state,
  value,
  inputRef,
  onChange,
}: {
  state: BattleState;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
}) {
  const hasWrong = state.wrongText !== "";
  const isFinishing = state.phase === "finishing";
  // 違う部分は、入力欄の中身の後ろ側にある。その手前までは普通の色で出す。
  const wrongStart = hasWrong ? Math.max(0, value.length - state.wrongText.length) : value.length;

  return (
    <div
      className={cn(
        "relative min-h-14 rounded-xl border-2 bg-track px-4 py-3 text-xl",
        isFinishing ? "border-correct" : hasWrong ? "border-wrong" : "border-label",
      )}
    >
      <div aria-hidden="true" className="pointer-events-none overflow-hidden whitespace-pre">
        {value === "" ? (
          <span className="text-fg-muted opacity-60">ここに うってね</span>
        ) : (
          <>
            <span>{value.slice(0, wrongStart)}</span>
            <span className="text-wrong">{value.slice(wrongStart)}</span>
          </>
        )}
        {/* 末尾に空の文字を置いて、行の高さを保つ。 */}
        <span>&#8203;</span>
      </div>
      {/*
        文字の大きさは 16px 以上にする（それより小さいと、iPhone が入力のときに画面を拡大する）。
        予測変換や自動の直しは抑える。
      */}
      <input
        ref={inputRef}
        type="text"
        lang="ja"
        aria-label="ここに うつ"
        disabled={isFinishing}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(event) => onChange(event.currentTarget.value)}
        className="absolute inset-0 w-full rounded-xl bg-transparent px-4 py-3 text-xl text-transparent caret-fg outline-none"
      />
    </div>
  );
}
