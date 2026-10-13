"use client";

import { useEffect, useRef, useState } from "react";
import type { CompositionEvent, FormEvent, KeyboardEvent } from "react";
import { BOSSES, BossCircle } from "@/modules/boss";
import { cn } from "@/shared/ui/utils";
import { judgeInput } from "../judge";

/**
 * 試作で打つ言葉。
 * 実機で確かめたい打ち方（濁点・小さい文字・同じキーの連続など）が一通り出るように選んである。
 */
const TRIAL_WORDS: readonly { text: string; note: string }[] = [
  { text: "さくら", note: "ふつうの文字だけ" },
  { text: "あいす", note: "同じキーの文字が続く（あ→い）" },
  { text: "がっこう", note: "濁点と、小さい「っ」" },
  { text: "えんぴつ", note: "半濁点" },
  { text: "きょうりゅう", note: "小さい「ょ」「ゅ」" },
  { text: "つづき", note: "「つ」のあとに「づ」" },
  { text: "らーめん", note: "のばす音" },
];

/** ミスがこの回数に達したら、ボスを「いかり」の見た目にする。 */
const ANGRY_MISSES = 5;

/** 画面に残す記録の行数。古い行から捨てる。 */
const MAX_LOG_LINES = 80;

/**
 * 間違えた文字の取り消し方。
 * 変換中の文字はキーボードの側も覚えているので、入力欄を書き換えるだけでは消えない機種がありうる。どれが成り立つかを実機で比べる。
 */
type CancelMethod = "rewrite" | "switch" | "manual";

const CANCEL_METHODS: readonly { id: CancelMethod; label: string; detail: string }[] = [
  {
    id: "rewrite",
    label: "A. 書きかえる",
    detail: "入力欄の中身を、正しく打てた所までに書きかえる",
  },
  {
    id: "switch",
    label: "B. 入力欄を切りかえる",
    detail: "もう 1 つの入力欄へ移り、変換中の文字をキーボードに捨てさせる",
  },
  { id: "manual", label: "C. 自分で消す", detail: "何もしない。打った人が消すキーで消す" },
];

/** 試作の進み具合。 */
type Game = {
  /** いま打っている言葉が TRIAL_WORDS の何番目か。 */
  wordIndex: number;
  /** いまの言葉の、正しく打てている文字数。 */
  confirmed: number;
  /** 打っている途中の形（「が」の途中の「か」など）。 */
  pending: string;
  /** ミスの回数（通算）。 */
  misses: number;
  /** 直前にミスになった文字。画面に赤く出す。 */
  lastWrong: string;
};

const INITIAL_GAME: Game = { wordIndex: 0, confirmed: 0, pending: "", misses: 0, lastWrong: "" };

/** キーボードが出ているときの、画面の見えている範囲の情報。 */
type ScreenInfo = {
  /** キーボードに隠れていない部分の高さ。 */
  visibleHeight: number;
  /** ボスとお題のかたまりの下端が、見えている範囲の上端から何 px の位置にあるか。 */
  blockBottom: number;
  userAgent: string;
};

/**
 * 入力の試作ページ（/trial）。スマホ標準のキーボードで 1 文字ごとの判定が成り立つかを、実機で確かめるために使う。
 * 確かめ終わったら消す（TODO の 9-1）。取り消し方と予測変換の抑え方を画面で切り替えられ、キーボードから届いた通知をそのまま記録に出す。
 */
export function TrialScreen() {
  const [game, setGame] = useState<Game>(INITIAL_GAME);
  const [cancelMethod, setCancelMethod] = useState<CancelMethod>("rewrite");
  const [suppress, setSuppress] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [screenInfo, setScreenInfo] = useState<ScreenInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // 通知は画面の描き直しを待たずに続けて届くことがあるので、最新の値を state とは別に持っておく。
  const gameRef = useRef<Game>(INITIAL_GAME);
  const activeIndexRef = useRef(0);
  const previousValueRef = useRef("");
  const logCountRef = useRef(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([null, null]);
  const blockRef = useRef<HTMLDivElement | null>(null);

  // キーボードの出し入れで見えている範囲が変わるたびに、ボスとお題が収まっているかを測り直す。
  useEffect(() => {
    const measure = () => {
      const viewport = window.visualViewport;
      const visibleTop = viewport?.offsetTop ?? 0;
      const block = blockRef.current?.getBoundingClientRect();
      setScreenInfo({
        visibleHeight: Math.round(viewport?.height ?? window.innerHeight),
        blockBottom: Math.round((block?.bottom ?? 0) - visibleTop),
        userAgent: navigator.userAgent,
      });
    };
    const firstMeasure = requestAnimationFrame(measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(firstMeasure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /** 進み具合を、通知を受ける側の控えと画面の両方へ反映する。 */
  function commit(next: Game) {
    gameRef.current = next;
    setGame(next);
  }

  /** 記録に 1 行足す。 */
  function addLog(line: string) {
    logCountRef.current += 1;
    const numbered = `${logCountRef.current} ${line}`;
    setLogs((previous) => [...previous.slice(-(MAX_LOG_LINES - 1)), numbered]);
    setCopied(false);
  }

  /** 入力欄の中身を `text` に戻す。戻し方は、画面で選んだ取り消し方に従う。 */
  function resetInput(current: HTMLInputElement, text: string) {
    previousValueRef.current = text;

    const nextIndex = 1 - activeIndexRef.current;
    const next = inputsRef.current[nextIndex];
    if (cancelMethod === "switch" && next) {
      // もう 1 つの入力欄へ移る。元の入力欄で変換中だった文字は、キーボードの側で打ち切られる。
      next.value = text;
      next.focus();
      next.setSelectionRange(text.length, text.length);
      current.value = "";
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      return;
    }

    current.value = text;
  }

  /** 入力欄の中身が変わったときに、お題と比べて進める・ミスにする・次の言葉へ移る。 */
  function handleInput(index: number, event: FormEvent<HTMLInputElement>) {
    const element = event.currentTarget;
    const native = event.nativeEvent as InputEvent;
    const value = element.value;
    addLog(
      `input[${index}] 種類=${native.inputType} 文字=${native.data} 変換中=${native.isComposing} 中身=「${value}」`,
    );

    // 切りかえる前の入力欄へ遅れて届いた通知は、判定に使わずに捨てる。
    if (index !== activeIndexRef.current) {
      element.value = "";
      return;
    }

    const current = gameRef.current;
    const target = TRIAL_WORDS[current.wordIndex].text;
    const result = judgeInput(target, value);
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (result.missed) {
      const wrong = value.slice(result.confirmed);

      if (cancelMethod === "manual") {
        // 間違えた文字が入力欄に残るので、消している途中（短くなった）の通知はミスに数えない。
        const isNewMiss = value !== previousValue && value.length >= previousValue.length;
        commit({
          ...current,
          confirmed: result.confirmed,
          pending: "",
          misses: current.misses + (isNewMiss ? 1 : 0),
          lastWrong: wrong,
        });
        return;
      }

      // 間違えた文字を取り消し、正しく打てた所までに戻す。
      resetInput(element, target.slice(0, result.confirmed));
      commit({
        ...current,
        confirmed: result.confirmed,
        pending: "",
        misses: current.misses + 1,
        lastWrong: wrong,
      });
      return;
    }

    // 最後の文字まで打てたら、入力欄を空にして次の言葉へ移る（最後の言葉の次は最初へ戻る）。
    if (result.confirmed === target.length) {
      resetInput(element, "");
      commit({
        wordIndex: (current.wordIndex + 1) % TRIAL_WORDS.length,
        confirmed: 0,
        pending: "",
        misses: current.misses,
        lastWrong: "",
      });
      return;
    }

    commit({ ...current, confirmed: result.confirmed, pending: result.pending, lastWrong: "" });
  }

  /** 変換の始まり・途中・終わりの通知を記録する（判定には使わない）。 */
  function handleComposition(index: number, event: CompositionEvent<HTMLInputElement>) {
    addLog(`${event.type}[${index}] 文字=${event.data}`);
  }

  /** キーを押した通知を記録する（判定には使わない）。 */
  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    addLog(`keydown[${index}] キー=${event.key} 変換中=${event.nativeEvent.isComposing}`);
  }

  /** 最初の言葉からやり直す。設定を変えたときにも呼び、前の設定で打った文字を残さない。 */
  function restart() {
    for (const input of inputsRef.current) {
      if (input) input.value = "";
    }
    previousValueRef.current = "";
    activeIndexRef.current = 0;
    setActiveIndex(0);
    commit(INITIAL_GAME);
  }

  /** 記録を、機種と設定が分かる見出しを付けてクリップボードへ写す。 */
  function copyLogs() {
    const header = [
      `機種: ${screenInfo?.userAgent ?? "不明"}`,
      `取り消し方: ${cancelMethod} / 予測変換を抑える指定: ${suppress ? "あり" : "なし"}`,
      `見えている高さ: ${screenInfo?.visibleHeight ?? "?"}px / かたまりの下端: ${screenInfo?.blockBottom ?? "?"}px`,
    ];
    void navigator.clipboard
      .writeText([...header, ...logs].join("\n"))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  const word = TRIAL_WORDS[game.wordIndex];
  const angry = game.misses >= ANGRY_MISSES;
  // ボスは誰でもよいので、一覧の先頭を使う。
  const boss = BOSSES[0];
  // 残りの言葉の数を HP の代わりにして、バーの長さを決める。
  const hpPercent = ((TRIAL_WORDS.length - game.wordIndex) / TRIAL_WORDS.length) * 100;
  const fits = screenInfo !== null && screenInfo.blockBottom <= screenInfo.visibleHeight;

  // 予測変換や自動の直しを抑えるための指定。「なし」を選んだときは何も付けない。
  const suppressProps = suppress
    ? ({
        autoComplete: "off",
        autoCorrect: "off",
        autoCapitalize: "none",
        spellCheck: false,
      } as const)
    : {};

  return (
    <main className={cn("min-h-dvh", angry ? "bg-angry-bg" : "bg-bg")}>
      <div className="mx-auto flex max-w-md flex-col p-4">
        {/* ここから下のかたまりが、キーボードを出したまま見えていてほしい部分。 */}
        <div ref={blockRef}>
          <div className="flex items-center justify-between text-sm text-fg-muted">
            <span>
              {game.wordIndex + 1} / {TRIAL_WORDS.length}語
            </span>
            <span>ミス {game.misses}回</span>
          </div>

          <div className="mt-2">
            <BossCircle boss={boss} size="md" angry={angry} />
            <p className="mt-1 text-center text-sm">{angry ? `いかりの${boss.name}` : boss.name}</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-track">
              <div className="h-full bg-hp" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          <div className="relative mt-4 rounded-xl border border-border bg-surface p-4">
            <p className="text-center text-xs text-fg-muted">{word.note}</p>
            {/* お題。打てた文字は緑、次に打つ文字には下線を付ける。 */}
            <p
              className="mt-1 text-center text-3xl font-medium tracking-widest"
              aria-label={word.text}
            >
              {Array.from(word.text).map((char, index) => (
                <span
                  key={index}
                  className={cn(
                    index < game.confirmed && "text-correct",
                    index === game.confirmed && "underline decoration-label underline-offset-8",
                  )}
                >
                  {char}
                </span>
              ))}
            </p>
            <p className="mt-2 h-6 text-center text-base" role="status">
              {game.lastWrong ? (
                <span className="text-wrong">「{game.lastWrong}」は ちがうよ</span>
              ) : game.pending ? (
                <span className="text-fg-muted">「{game.pending}」→ つづけて</span>
              ) : (
                <span className="text-fg-muted">ここを タップして うつ</span>
              )}
            </p>

            {/*
              入力欄は 2 つ置く。取り消し方 B のときだけ、ミスのたびに交互に使う。
              ふだんは透明にしてお題の上に重ね、お題をタップするとキーボードが出るようにする。
              文字の大きさは 16px 以上にする（それより小さいと、iPhone が入力のときに画面を拡大する）。
            */}
            {[0, 1].map((index) => (
              <input
                key={`${index}-${suppress}`}
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                type="text"
                lang="ja"
                aria-label={`にゅうりょく${index + 1}`}
                {...suppressProps}
                onInput={(event) => handleInput(index, event)}
                onCompositionStart={(event) => handleComposition(index, event)}
                onCompositionUpdate={(event) => handleComposition(index, event)}
                onCompositionEnd={(event) => handleComposition(index, event)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className={cn(
                  "text-base",
                  showInput
                    ? "mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2"
                    : "absolute inset-0 size-full opacity-0",
                  index !== activeIndex && "pointer-events-none",
                  showInput && index !== activeIndex && "opacity-40",
                )}
              />
            ))}
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-border p-4 text-sm">
          <h2 className="text-base font-medium">画面の収まり</h2>
          {screenInfo ? (
            <p className="mt-2">
              見えている高さ {screenInfo.visibleHeight}px / ボスとお題の下端{" "}
              {screenInfo.blockBottom}px →{" "}
              <span className={fits ? "text-correct" : "text-wrong"}>
                {fits ? "収まっている" : "はみ出している"}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-fg-muted">はかっています…</p>
          )}
          <p className="mt-1 text-fg-muted">キーボードを出したままの数字を見る。</p>
        </section>

        <section className="mt-4 rounded-xl border border-border p-4 text-sm">
          <h2 className="text-base font-medium">設定</h2>

          <fieldset className="mt-3">
            <legend className="text-fg-muted">間違えた文字の取り消し方</legend>
            {CANCEL_METHODS.map((method) => (
              <label key={method.id} className="mt-2 flex min-h-11 items-start gap-2">
                <input
                  type="radio"
                  name="cancel-method"
                  className="mt-1 size-5"
                  checked={cancelMethod === method.id}
                  onChange={() => {
                    setCancelMethod(method.id);
                    restart();
                  }}
                />
                <span>
                  {method.label}
                  <span className="block text-fg-muted">{method.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="mt-3 flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-5"
              checked={suppress}
              onChange={(event) => {
                setSuppress(event.target.checked);
                restart();
              }}
            />
            予測変換を抑える指定を付ける
          </label>

          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-5"
              checked={showInput}
              onChange={(event) => setShowInput(event.target.checked)}
            />
            入力欄を見えるようにする
          </label>

          <button
            type="button"
            onClick={restart}
            className="mt-2 min-h-11 w-full rounded-xl border border-border px-4 py-3 text-base"
          >
            さいしょから
          </button>
        </section>

        <section className="mt-4 rounded-xl border border-border p-4 text-sm">
          <h2 className="text-base font-medium">キーボードから届いた通知</h2>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={copyLogs}
              className="min-h-11 flex-1 rounded-xl border border-primary bg-primary px-4 py-3 text-base text-white"
            >
              {copied ? "コピーしました" : "コピーする"}
            </button>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="min-h-11 flex-1 rounded-xl border border-border px-4 py-3 text-base"
            >
              けす
            </button>
          </div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-track p-2 text-xs break-all whitespace-pre-wrap">
            {logs.length > 0 ? logs.join("\n") : "（まだ無い）"}
          </pre>
          <p className="mt-2 text-xs break-all text-fg-muted">{screenInfo?.userAgent}</p>
        </section>

        <section className="mt-4 rounded-xl border border-border p-4 text-sm">
          <h2 className="text-base font-medium">確かめること</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>お題どおりに打つと、1 文字ごとに緑になり、次の言葉へ進む</li>
            <li>「が」「っ」「ぴ」「ょ」「づ」を打つ途中で、ミスが増えない</li>
            <li>わざと違う文字を打つと、ミスが 1 回だけ増え、続けて正しい文字を打てる</li>
            <li>取り消し方 A・B・C のそれぞれで 3 を試す</li>
            <li>予測変換の候補が出るか。候補を選んだらどうなるか</li>
            <li>キーボードを出したまま、ボスとお題が見えているか</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
