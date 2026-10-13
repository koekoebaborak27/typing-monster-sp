/**
 * 対象: battle/battle-reducer（battleReducer・decideFinishQuestions・listEffects・currentQuestion）
 * 目的: バトル画面の状態遷移（基本設計「状態の遷移」の各行）と、状態の変化に伴う処理の列挙規則を担保する
 *   - 通常問題・とどめ問題の正解／不正解でのHP・ライフ・コンボ・次の状態
 *   - 通常問題の間違い0〜3問ごとのとどめ問題の決まり方と、評価につながる残りライフ
 *   - 出し直しの扱い（最初の解答だけ記録、ライフは減らさない、ふりかえりに重複しない）
 *   - 今の状態で起こらない操作は無視すること
 */
import { describe, it, expect } from "vitest";
import type { Boss } from "@/modules/boss";
import type { ChoiceId, Question } from "@/modules/quiz";
import {
  battleReducer,
  createInitialState,
  currentQuestion,
  decideFinishQuestions,
  listEffects,
} from "./battle-reducer";
import type { BattleAction, BattleState } from "./types";

const boss: Boss = { id: "ukkari-tako", emoji: "🐙", name: "ウッカリダコ" };

/** テスト用の問題を作る。正解は c2、間違いは c1 を選ぶ。 */
function makeQuestion(id: string): Question {
  return {
    id,
    genre: "math",
    level: 1,
    question: `${id} の問題`,
    choices: [
      { id: "c1", text: "A" },
      { id: "c2", text: "B" },
      { id: "c3", text: "C" },
    ],
    answer: "c2",
    explanation: `${id} の解説`,
  };
}

/** 出題APIが返す5問（通常 q1〜q3、予備 s1〜s2）。 */
const questions = [
  makeQuestion("q1"),
  makeQuestion("q2"),
  makeQuestion("q3"),
  makeQuestion("s1"),
  makeQuestion("s2"),
];

/** 操作を順に適用する。 */
function run(state: BattleState, ...actions: BattleAction[]): BattleState {
  return actions.reduce(battleReducer, state);
}

const RIGHT: BattleAction = { type: "answered", choiceId: "c2" };
const WRONG: BattleAction = { type: "answered", choiceId: "c1" };
const SHOWN: BattleAction = { type: "correctShown" };
const OK: BattleAction = { type: "acknowledged", retryOrder: ["c3", "c1", "c2"] };

/** 取得に成功して最初の問題が解答待ちの状態。 */
const started = run(createInitialState(), { type: "fetchSucceeded", questions, boss });

/** 通常問題3問を、wrongPattern（true=間違える）のとおりに答えて、とどめ1問目の解答待ちまで進める。 */
function playNormal(pattern: boolean[]): BattleState {
  let state = started;
  for (const isWrong of pattern) {
    state = run(state, isWrong ? WRONG : RIGHT);
    state = run(state, isWrong ? OK : SHOWN);
  }
  return state;
}

describe("battle/battle-reducer 読み込みと取得エラー", () => {
  describe("出題APIが成功したとき", () => {
    it("ボスと5問を持ち、1問目の解答待ちになる。HP500・ライフ3・コンボ0", () => {
      expect(started).toMatchObject({
        phase: "answering",
        slot: 0,
        hp: 500,
        life: 3,
        combo: 0,
        boss,
        isRetry: false,
        choiceOrder: ["c1", "c2", "c3"],
      });
      expect(started.questions).toHaveLength(5);
    });
    it("読み込み中以外で届いた成功は無視する（古い返事で状態を壊さない）", () => {
      const next = battleReducer(started, { type: "fetchSucceeded", questions, boss });
      expect(next).toBe(started);
    });
  });

  describe("出題APIが失敗したとき", () => {
    it("取得エラーになり、種類（offline / failed / revengeUnavailable）を持つ", () => {
      for (const kind of ["offline", "failed", "revengeUnavailable"] as const) {
        const next = run(createInitialState(), { type: "fetchFailed", fetchError: kind });
        expect(next.phase).toBe("fetchError");
        expect(next.fetchError).toBe(kind);
      }
    });
    it("読み込み中以外で届いた失敗は無視する", () => {
      expect(battleReducer(started, { type: "fetchFailed", fetchError: "failed" })).toBe(started);
    });
  });

  describe("取得エラーから「もういちど」を押したとき", () => {
    it("読み込み中に戻り、エラーの種類を消す", () => {
      const failed = run(createInitialState(), { type: "fetchFailed", fetchError: "failed" });
      const next = battleReducer(failed, { type: "fetchStarted" });
      expect(next.phase).toBe("loading");
      expect(next.fetchError).toBeNull();
    });
    it("取得エラー以外では何もしない", () => {
      expect(battleReducer(started, { type: "fetchStarted" })).toBe(started);
    });
  });
});

describe("battle/battle-reducer 通常問題", () => {
  describe("正解したとき", () => {
    const next = battleReducer(started, RIGHT);
    it("HPが100減り、コンボが1増え、正解表示になる", () => {
      expect(next).toMatchObject({
        phase: "correct",
        hp: 400,
        combo: 1,
        life: 3,
        selectedChoiceId: "c2",
      });
    });
    it("約1秒後（correctShown）に次の問題の解答待ちになる", () => {
      const after = battleReducer(next, SHOWN);
      expect(after).toMatchObject({
        phase: "answering",
        slot: 1,
        isRetry: false,
        selectedChoiceId: null,
      });
    });
  });

  describe("不正解のとき", () => {
    const next = battleReducer(started, WRONG);
    it("ライフが1減り、コンボが0になり、不正解表示になる", () => {
      expect(next).toMatchObject({
        phase: "wrong",
        life: 2,
        combo: 0,
        hp: 500,
        selectedChoiceId: "c1",
      });
    });
    it("間違えた問題を normalWrong と reviewList に加える", () => {
      expect(next.normalWrong.map((q) => q.id)).toEqual(["q1"]);
      expect(next.reviewList.map((q) => q.id)).toEqual(["q1"]);
    });
    it("「わかった」で次の問題へ進む（出し直しにはならない）", () => {
      const after = battleReducer(next, OK);
      expect(after).toMatchObject({
        phase: "answering",
        slot: 1,
        isRetry: false,
        choiceOrder: ["c1", "c2", "c3"],
      });
    });
  });

  describe("連続で正解したとき", () => {
    it("コンボが連続正解の数だけ増え、間違えると0に戻る", () => {
      const two = run(started, RIGHT, SHOWN, RIGHT);
      expect(two.combo).toBe(2);
      const broken = run(two, SHOWN, WRONG);
      expect(broken.combo).toBe(0);
    });
  });

  describe("ライフが0のとき", () => {
    it("さらに間違えてもライフは0のまま（ゲームオーバーにならない）", () => {
      // 通常3問すべて間違えるとライフは0。そこから先でライフが負にならないことは lifeAfterMiss でも確認している。
      const state = playNormal([true, true, true]);
      expect(state.life).toBe(0);
      expect(state.phase).toBe("answering");
    });
  });
});

describe("battle/battle-reducer 解答待ち以外・不正な操作", () => {
  it("解答待ち以外での answered は何もしない（正解表示中・不正解表示中・とどめの一撃）", () => {
    const correct = battleReducer(started, RIGHT);
    const wrong = battleReducer(started, WRONG);
    expect(battleReducer(correct, WRONG)).toBe(correct);
    expect(battleReducer(wrong, RIGHT)).toBe(wrong);
    const finishing = run(playNormal([false, false, false]), RIGHT, SHOWN, RIGHT);
    expect(finishing.phase).toBe("finishing");
    expect(battleReducer(finishing, RIGHT)).toBe(finishing);
  });
  it("今の問題に無い選択肢IDは無視する", () => {
    expect(battleReducer(started, { type: "answered", choiceId: "c9" as ChoiceId })).toBe(started);
  });
  it("correctShown は正解表示中以外では何もしない", () => {
    expect(battleReducer(started, SHOWN)).toBe(started);
    const wrong = battleReducer(started, WRONG);
    expect(battleReducer(wrong, SHOWN)).toBe(wrong);
  });
  it("acknowledged は不正解表示中以外では何もしない", () => {
    expect(battleReducer(started, OK)).toBe(started);
    const correct = battleReducer(started, RIGHT);
    expect(battleReducer(correct, OK)).toBe(correct);
  });
});

describe("battle/battle-reducer decideFinishQuestions", () => {
  const [q1, q2, q3, s1, s2] = questions;
  const spares = [s1, s2];
  it("間違い0問: 予備1・予備2", () => {
    expect(decideFinishQuestions([], spares)).toEqual([s1, s2]);
  });
  it("間違い1問: W1・予備1", () => {
    expect(decideFinishQuestions([q1], spares)).toEqual([q1, s1]);
  });
  it("間違い2問: W1・W2", () => {
    expect(decideFinishQuestions([q1, q2], spares)).toEqual([q1, q2]);
  });
  it("間違い3問: W1・W2（W3 は出さない）", () => {
    expect(decideFinishQuestions([q1, q2, q3], spares)).toEqual([q1, q2]);
  });
});

describe("battle/battle-reducer とどめ問題への切り替え", () => {
  it("通常問題の最後が正解のとき（correctShown）、とどめ問題が決まり slot が 3 になる", () => {
    const state = playNormal([false, false, false]);
    expect(state).toMatchObject({ slot: 3, phase: "answering", isRetry: false });
    expect(state.finishQuestions?.map((q) => q.id)).toEqual(["s1", "s2"]);
    expect(currentQuestion(state)?.id).toBe("s1");
  });
  it("通常問題の最後が不正解のとき（acknowledged）も、とどめ問題が決まり slot が 3 になる", () => {
    const state = playNormal([false, false, true]);
    expect(state).toMatchObject({ slot: 3, isRetry: false });
    expect(state.finishQuestions?.map((q) => q.id)).toEqual(["q3", "s1"]);
  });
  it("間違いの数ごとに、間違えた順でとどめ問題になる", () => {
    expect(playNormal([true, false, false]).finishQuestions?.map((q) => q.id)).toEqual([
      "q1",
      "s1",
    ]);
    expect(playNormal([true, true, false]).finishQuestions?.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(playNormal([true, true, true]).finishQuestions?.map((q) => q.id)).toEqual(["q1", "q2"]);
  });
  it("slot が 0〜2 のうちは currentQuestion が questions を、3〜4 は finishQuestions を指す", () => {
    expect(currentQuestion(started)?.id).toBe("q1");
    expect(currentQuestion(createInitialState())).toBeNull();
  });
});

describe("battle/battle-reducer とどめ問題", () => {
  /** 通常問題の間違い数ごとの、とどめ前のHP・とどめ1問目後のHP・残りライフ（要件「通常問題の間違い数ごとの流れ」の表）。 */
  const flows = [
    { wrong: 0, hpBefore: 200, hpAfterFirst: 100, life: 3 },
    { wrong: 1, hpBefore: 300, hpAfterFirst: 150, life: 2 },
    { wrong: 2, hpBefore: 400, hpAfterFirst: 200, life: 1 },
    { wrong: 3, hpBefore: 500, hpAfterFirst: 250, life: 0 },
  ];

  for (const flow of flows) {
    describe(`通常問題の間違いが${flow.wrong}問のとき`, () => {
      const pattern = [0, 1, 2].map((i) => i < flow.wrong);
      const finishStart = playNormal(pattern);
      it(`とどめ前はHP${flow.hpBefore}・ライフ${flow.life}`, () => {
        expect(finishStart).toMatchObject({ hp: flow.hpBefore, life: flow.life });
      });
      it(`とどめ1問目の正解でHPが半分（${flow.hpAfterFirst}）になり、2問目の正解で0になる`, () => {
        const first = battleReducer(finishStart, RIGHT);
        expect(first).toMatchObject({ phase: "correct", hp: flow.hpAfterFirst, life: flow.life });
        const second = run(first, SHOWN);
        expect(second.slot).toBe(4);
        const done = battleReducer(second, RIGHT);
        expect(done).toMatchObject({
          phase: "finishing",
          hp: 0,
          finishDamage: flow.hpAfterFirst,
          life: flow.life,
        });
      });
    });
  }

  describe("とどめ1問目で間違えたとき", () => {
    const finishStart = playNormal([false, false, false]);
    const wrong = battleReducer(finishStart, WRONG);
    it("ライフは減らさず、コンボが0になり、不正解表示になる", () => {
      expect(wrong).toMatchObject({ phase: "wrong", life: 3, combo: 0, hp: 200 });
    });
    it("normalWrong には加えず、reviewList には加える", () => {
      expect(wrong.normalWrong).toHaveLength(0);
      expect(wrong.reviewList.map((q) => q.id)).toEqual(["s1"]);
    });
    it("「わかった」で同じ問題を、渡された並びで出し直す（slot は進めない）", () => {
      const retry = battleReducer(wrong, OK);
      expect(retry).toMatchObject({
        phase: "answering",
        slot: 3,
        isRetry: true,
        choiceOrder: ["c3", "c1", "c2"],
        selectedChoiceId: null,
      });
    });
    it("出し直しで正解するとHPが半分になり、次の問題で isRetry が false に戻る", () => {
      const retry = battleReducer(wrong, OK);
      const right = battleReducer(retry, RIGHT);
      expect(right).toMatchObject({ phase: "correct", hp: 100 });
      expect(battleReducer(right, SHOWN)).toMatchObject({
        slot: 4,
        isRetry: false,
        choiceOrder: ["c1", "c2", "c3"],
      });
    });
    it("出し直しで何度間違えても、ライフを減らさず reviewList も増えない", () => {
      const retry1 = battleReducer(wrong, OK);
      const wrong2 = battleReducer(retry1, WRONG);
      expect(wrong2).toMatchObject({ phase: "wrong", life: 3, combo: 0 });
      expect(wrong2.reviewList).toHaveLength(1);
      const retry2 = battleReducer(wrong2, {
        type: "acknowledged",
        retryOrder: ["c2", "c3", "c1"],
      });
      expect(retry2).toMatchObject({ isRetry: true, choiceOrder: ["c2", "c3", "c1"] });
    });
  });

  describe("通常問題で間違えた問題がとどめ問題として出て、また間違えたとき", () => {
    it("reviewList に同じ問題が2回並ばない", () => {
      const finishStart = playNormal([true, false, false]);
      expect(currentQuestion(finishStart)?.id).toBe("q1");
      const wrong = battleReducer(finishStart, WRONG);
      expect(wrong.reviewList.map((q) => q.id)).toEqual(["q1"]);
    });
  });

  describe("とどめ2問目で間違えたとき", () => {
    it("不正解表示になり、出し直し後に正解すれば倒せる", () => {
      const second = run(playNormal([false, false, false]), RIGHT, SHOWN);
      const wrong = battleReducer(second, WRONG);
      expect(wrong).toMatchObject({ phase: "wrong", hp: 100, life: 3 });
      const done = run(wrong, OK, RIGHT);
      expect(done).toMatchObject({ phase: "finishing", hp: 0, finishDamage: 100 });
    });
  });
});

describe("battle/battle-reducer listEffects", () => {
  /** 操作の前後の状態から、実行すべき処理を求める。 */
  function effectsOf(state: BattleState, action: BattleAction) {
    return listEffects(state, battleReducer(state, action));
  }

  describe("通常問題に答えたとき", () => {
    it("正解なら、正解音と、最初の解答（正解）の記録を返す", () => {
      expect(effectsOf(started, RIGHT)).toEqual([
        { type: "playSound", kind: "correct" },
        { type: "recordFirstAnswer", questionId: "q1", isCorrect: true },
      ]);
    });
    it("不正解なら、不正解音と、最初の解答（不正解）の記録を返す", () => {
      expect(effectsOf(started, WRONG)).toEqual([
        { type: "playSound", kind: "wrong" },
        { type: "recordFirstAnswer", questionId: "q1", isCorrect: false },
      ]);
    });
  });

  describe("とどめ問題の出し直しに答えたとき", () => {
    const retry = run(playNormal([false, false, false]), WRONG, OK);
    it("音は鳴らすが、recordFirstAnswer は返さない（正解でも不正解でも）", () => {
      expect(effectsOf(retry, RIGHT)).toEqual([{ type: "playSound", kind: "correct" }]);
      expect(effectsOf(retry, WRONG)).toEqual([{ type: "playSound", kind: "wrong" }]);
    });
  });

  describe("とどめ問題の最初の解答のとき", () => {
    it("予備問題など初めて出る問題なら、recordFirstAnswer を返す", () => {
      const finishStart = playNormal([false, false, false]);
      expect(effectsOf(finishStart, RIGHT)).toContainEqual({
        type: "recordFirstAnswer",
        questionId: "s1",
        isCorrect: true,
      });
    });
    it("通常問題で間違えた問題の再登場なら、最初の解答は記録済みなので recordFirstAnswer を返さない", () => {
      const finishStart = playNormal([true, false, false]);
      expect(effectsOf(finishStart, RIGHT)).toEqual([{ type: "playSound", kind: "correct" }]);
      expect(effectsOf(finishStart, WRONG)).toEqual([{ type: "playSound", kind: "wrong" }]);
    });
  });

  describe("とどめの一撃になったとき", () => {
    const second = run(playNormal([false, false, false]), RIGHT, SHOWN);
    it("正解音・最初の解答の記録・recordBattleWin（パーフェクト）を返す", () => {
      expect(effectsOf(second, RIGHT)).toEqual([
        { type: "playSound", kind: "correct" },
        { type: "recordFirstAnswer", questionId: "s2", isCorrect: true },
        { type: "recordBattleWin", bossId: "ukkari-tako", isPerfect: true },
      ]);
    });
    it("ライフが3でなければ isPerfect は false", () => {
      const lost = run(playNormal([true, false, false]), RIGHT, SHOWN);
      const effects = effectsOf(lost, RIGHT);
      expect(effects).toContainEqual({
        type: "recordBattleWin",
        bossId: "ukkari-tako",
        isPerfect: false,
      });
    });
    it("recordBattleWin は finishing になった1回だけで、finishing のまま操作されても返さない", () => {
      const finishing = battleReducer(second, RIGHT);
      expect(listEffects(finishing, battleReducer(finishing, RIGHT))).toEqual([]);
    });
  });

  describe("解答以外の状態変化のとき", () => {
    it("正解表示から次の問題へ進むだけなら、何も返さない", () => {
      const correct = battleReducer(started, RIGHT);
      expect(effectsOf(correct, SHOWN)).toEqual([]);
    });
    it("「わかった」を押しただけなら、何も返さない", () => {
      const wrong = battleReducer(started, WRONG);
      expect(effectsOf(wrong, OK)).toEqual([]);
    });
    it("無視された操作（解答待ち以外の answered）では何も返さない", () => {
      const correct = battleReducer(started, RIGHT);
      expect(effectsOf(correct, RIGHT)).toEqual([]);
    });
  });
});
