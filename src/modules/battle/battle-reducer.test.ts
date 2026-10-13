/**
 * テストの目的（大項目）
 * 1. 基本設計「状態の遷移」の表の各行どおりに、状態が変わること
 * 2. ミスを数えるのは「合っている → 違っている」の1回だけであること
 * 3. HPが 500 → 400 → 300 → 200 → 100 → 0 と減ること
 * 4. listEffects が、音・入力欄を空にする・撃破の記録を、決まった場面でだけ返すこと
 */
import { describe, it, expect } from "vitest";
import type { Boss } from "@/modules/boss";
import type { Word } from "@/modules/word";
import { battleReducer, createInitialState, currentWord, listEffects } from "./battle-reducer";
import type { BattleState } from "./types";

const BOSS: Boss = { id: "renda-dako", emoji: "🐙", name: "レンダダコ" };

const WORDS: Word[] = [
  { id: "w-1", text: "がっこう" },
  { id: "w-2", text: "さくら" },
  { id: "w-3", text: "いぬ" },
  { id: "w-4", text: "ねこ" },
  { id: "w-5", text: "うみ" },
];

/** 入力欄の中身を順に変えたあとの状態を返す。 */
const type = (state: BattleState, ...values: string[]) =>
  values.reduce((s, value) => battleReducer(s, { type: "inputChanged", value }), state);

/** 今のお題を打ち終え、ダメージ表示が終わって次のお題になった状態を返す。 */
const clearWord = (state: BattleState) =>
  battleReducer(type(state, currentWord(state).text), { type: "damageShown" });

/** 先頭から count 問を打ち終えた状態を返す。 */
const afterWords = (count: number) => {
  let state = createInitialState(BOSS, WORDS);
  for (let i = 0; i < count; i++) state = clearWord(state);
  return state;
};

describe("battle/battle-reducer createInitialState", () => {
  it("入力待ちで、1問目・HP500・ミス0回から始まる", () => {
    expect(createInitialState(BOSS, WORDS)).toEqual({
      phase: "typing",
      boss: BOSS,
      words: WORDS,
      slot: 0,
      hp: 500,
      typedCount: 0,
      wrongText: "",
      needsJapaneseInput: false,
      missCount: 0,
      lastDamage: 0,
    });
  });
});

describe("battle/battle-reducer currentWord", () => {
  it("何問目かに合ったお題を返す", () => {
    expect(currentWord(afterWords(0)).text).toBe("がっこう");
    expect(currentWord(afterWords(2)).text).toBe("いぬ");
  });
});

describe("battle/battle-reducer battleReducer", () => {
  describe("入力待ちで、入力欄の中身が合っているとき（まだ途中）", () => {
    it("正しく打てた文字数に更新し、ミスは増やさない", () => {
      const state = type(afterWords(0), "がっ");
      expect(state).toMatchObject({ phase: "typing", typedCount: 2, wrongText: "", missCount: 0 });
    });
    it("途中の形（「が」の途中の「か」）はミスにせず、打てた文字数にも数えない", () => {
      const state = type(afterWords(0), "か");
      expect(state).toMatchObject({ typedCount: 0, wrongText: "", missCount: 0 });
    });
    it("ローマ字の途中（「がっk」）はミスにしない", () => {
      const state = type(afterWords(0), "がっk");
      expect(state).toMatchObject({ typedCount: 2, wrongText: "", missCount: 0 });
    });
  });

  describe("入力待ちで、入力欄の中身が違っているとき（直前は合っていた）", () => {
    it("ミスを1回数え、違う部分を wrongText に持つ", () => {
      const state = type(afterWords(0), "がっ", "がっけ");
      expect(state).toMatchObject({
        phase: "typing",
        typedCount: 2,
        wrongText: "け",
        needsJapaneseInput: false,
        missCount: 1,
      });
    });
    it("英字が5文字以上なら、needsJapaneseInput を true にしてミスを1回数える", () => {
      const state = type(afterWords(1), "saku", "sakur");
      expect(state).toMatchObject({
        typedCount: 0,
        wrongText: "sakur",
        needsJapaneseInput: true,
        missCount: 1,
      });
    });
    it("漢字に変換されたときも、ミスを1回数える", () => {
      const state = type(afterWords(1), "さく", "桜");
      expect(state).toMatchObject({ typedCount: 0, wrongText: "桜", missCount: 1 });
    });
  });

  describe("入力待ちで、入力欄の中身が違っているとき（直前も違っていた）", () => {
    it("続けて打っても、ミスは増やさない", () => {
      const state = type(afterWords(0), "がっけ", "がっけう");
      expect(state).toMatchObject({ typedCount: 2, wrongText: "けう", missCount: 1 });
    });
    it("違う文字が別の違う文字に変わっても、ミスは増やさない", () => {
      const state = type(afterWords(0), "がっけ", "がっげ");
      expect(state).toMatchObject({ wrongText: "げ", missCount: 1 });
    });
    it("途中まで消しても違う文字が残っていれば、ミスは増やさない", () => {
      const state = type(afterWords(0), "がっけう", "がっけ");
      expect(state).toMatchObject({ wrongText: "け", missCount: 1 });
    });
    it("正しく打てていた文字まで違う中身に変わっても、ミスは増やさない", () => {
      const state = type(afterWords(0), "がっけ", "がけ");
      expect(state).toMatchObject({ typedCount: 1, wrongText: "け", missCount: 1 });
    });
  });

  describe("違う部分をすべて消して、合っている状態に戻ったとき", () => {
    it("wrongText と needsJapaneseInput を戻し、ミスの回数はそのままにする", () => {
      const state = type(afterWords(1), "sakur", "");
      expect(state).toMatchObject({ wrongText: "", needsJapaneseInput: false, missCount: 1 });
    });
    it("そのあとまた違う文字を打ったら、次の1回として数える", () => {
      const state = type(afterWords(0), "がっけ", "がっ", "がっか");
      expect(state).toMatchObject({ typedCount: 2, wrongText: "か", missCount: 2 });
    });
  });

  describe("設計書の「がっこう」の例のとおりに打ったとき", () => {
    it("ミスの回数が 0・0・0・0・1・1・1・1・2 と変わる", () => {
      const values = ["か", "が", "がつ", "がっ", "がっけ", "がっけう", "がっけ", "がっ", "がっか"];
      let state = afterWords(0);
      const counts = values.map((value) => {
        state = type(state, value);
        return state.missCount;
      });
      expect(counts).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2]);
    });
  });

  describe("通常問題（1〜3問目）を最後の文字まで打てたとき", () => {
    it("HPを100減らし、ダメージ表示へ進む", () => {
      const state = type(afterWords(0), "がっこう");
      expect(state).toMatchObject({ phase: "damage", hp: 400, lastDamage: 100, typedCount: 4 });
    });
    it("ミスのあとに打ち直して打ち終えても、同じだけ減らす（ミスの回数は残る）", () => {
      const state = type(afterWords(0), "がっけ", "がっ", "がっこう");
      expect(state).toMatchObject({ phase: "damage", hp: 400, wrongText: "", missCount: 1 });
    });
  });

  describe("とどめ問題の1問目（4問目）を最後の文字まで打てたとき", () => {
    it("残りHPの半分を減らし、ダメージ表示へ進む", () => {
      const state = type(afterWords(3), "ねこ");
      expect(state).toMatchObject({ phase: "damage", slot: 3, hp: 100, lastDamage: 100 });
    });
  });

  describe("とどめ問題の2問目（5問目）を最後の文字まで打てたとき", () => {
    it("HPを0にし、減らす前のHPを lastDamage に入れて、とどめの一撃へ進む", () => {
      const state = type(afterWords(4), "うみ");
      expect(state).toMatchObject({ phase: "finishing", slot: 4, hp: 0, lastDamage: 100 });
    });
  });

  describe("5問を続けて打ち終えたとき", () => {
    it("HPが 500 → 400 → 300 → 200 → 100 → 0 と減る", () => {
      const hps = [0, 1, 2, 3, 4].map((count) => afterWords(count).hp);
      const last = type(afterWords(4), "うみ").hp;
      expect([...hps, last]).toEqual([500, 400, 300, 200, 100, 0]);
    });
  });

  describe("ダメージ表示で、約1秒たったとき（damageShown）", () => {
    it("次のお題へ進み、打てた文字数を0に戻して入力待ちになる", () => {
      const state = battleReducer(type(afterWords(0), "がっこう"), { type: "damageShown" });
      expect(state).toMatchObject({ phase: "typing", slot: 1, typedCount: 0, hp: 400 });
    });
    it("ミスの回数は次のお題へ引き継ぐ", () => {
      const state = clearWord(type(afterWords(0), "がっけ", "がっ"));
      expect(state).toMatchObject({ slot: 1, missCount: 1 });
    });
  });

  describe("ダメージ表示の間に、入力欄の中身が変わったとき", () => {
    it("判定せず、状態を変えない（ミスにも数えない）", () => {
      const damage = type(afterWords(0), "がっこう");
      expect(type(damage, "がっこうあ")).toBe(damage);
    });
  });

  describe("とどめの一撃の間に、操作が届いたとき", () => {
    it("inputChanged も damageShown も無視する", () => {
      const finishing = type(afterWords(4), "うみ");
      expect(type(finishing, "うみあ")).toBe(finishing);
      expect(battleReducer(finishing, { type: "damageShown" })).toBe(finishing);
    });
  });

  describe("入力待ちの間に、damageShown が届いたとき", () => {
    it("無視する", () => {
      const state = afterWords(0);
      expect(battleReducer(state, { type: "damageShown" })).toBe(state);
    });
  });
});

describe("battle/battle-reducer listEffects", () => {
  describe("ミスを数えたとき", () => {
    it("ミスの音を返す", () => {
      const prev = afterWords(0);
      expect(listEffects(prev, type(prev, "け"))).toEqual([{ type: "playSound", kind: "miss" }]);
    });
  });

  describe("違う文字が残っていて、ミスを数えなかったとき", () => {
    it("何も返さない", () => {
      const prev = type(afterWords(0), "け");
      expect(listEffects(prev, type(prev, "けう"))).toEqual([]);
    });
  });

  describe("合っている文字を打ったとき（まだ途中）", () => {
    it("何も返さない", () => {
      const prev = afterWords(0);
      expect(listEffects(prev, type(prev, "が"))).toEqual([]);
    });
  });

  describe("言葉を打ち終えて、ダメージ表示へ進んだとき", () => {
    it("打ち終えたときの音だけを返す", () => {
      const prev = afterWords(0);
      expect(listEffects(prev, type(prev, "がっこう"))).toEqual([
        { type: "playSound", kind: "complete" },
      ]);
    });
  });

  describe("ダメージ表示から、次のお題へ進んだとき", () => {
    it("入力欄を空にする処理だけを返す", () => {
      const prev = type(afterWords(0), "がっこう");
      const next = battleReducer(prev, { type: "damageShown" });
      expect(listEffects(prev, next)).toEqual([{ type: "clearInput" }]);
    });
  });

  describe("最後の言葉を打ち終えて、とどめの一撃になったとき", () => {
    it("ミス0回なら、打ち終えたときの音と、パーフェクトの撃破の記録を返す", () => {
      const prev = afterWords(4);
      expect(listEffects(prev, type(prev, "うみ"))).toEqual([
        { type: "playSound", kind: "complete" },
        { type: "recordBattleWin", bossId: "renda-dako", isPerfect: true },
      ]);
    });
    it("ミスが1回でもあれば、isPerfect は false になる", () => {
      const prev = type(afterWords(4), "け", "");
      expect(listEffects(prev, type(prev, "うみ"))).toContainEqual({
        type: "recordBattleWin",
        bossId: "renda-dako",
        isPerfect: false,
      });
    });
  });

  describe("とどめの一撃のまま、状態が変わらなかったとき", () => {
    it("撃破の記録をもう一度返さない", () => {
      const finishing = type(afterWords(4), "うみ");
      expect(listEffects(finishing, type(finishing, "うみあ"))).toEqual([]);
    });
  });
});
