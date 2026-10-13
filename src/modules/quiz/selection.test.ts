/**
 * テストの目的（大項目）
 * 1. 通常モード：重複なしの5問（通常3＋予備2）を、教科がすべて異なる形で選ぶこと
 * 2. 通常モード：間違えた問題を優先し、最近出た問題を避け、足りなければ最近出た問題も使うこと
 * 3. リベンジモード：間違えた問題だけから5問を選び、5問に満たなければ 409 にすること
 * 4. 存在しない問題IDは無視して、unknownIds で知らせること
 *
 * 乱数は引数で渡せるので、決まった種から作った乱数（seededRandom）で結果を固定する。
 */
import { describe, it, expect } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import { chooseQuestions, type Random } from "./selection";
import type { Genre, Level, Question, QuestionRequest } from "./types";

const GENRES: Genre[] = ["japanese", "math", "science", "social", "logic"];
const LEVELS: Level[] = [1, 2, 3];

/** 同じ種からは同じ並びの乱数を返す（mulberry32）。 */
function seededRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** テスト用の問題を作る。必要な項目だけ上書きする。 */
function makeQuestion(overrides: Partial<Question> & Pick<Question, "id">): Question {
  return {
    genre: "math",
    level: 1,
    question: "問題文",
    choices: [
      { id: "c1", text: "選択肢1" },
      { id: "c2", text: "選択肢2" },
      { id: "c3", text: "選択肢3" },
    ],
    answer: "c1",
    explanation: "解説",
    ...overrides,
  };
}

/** 難易度×教科ごとに perGenre 問ずつ並べた問題一覧を作る。ID は `l{level}-{genre}-{2桁}`。 */
function makeQuestions(perGenre: number): Question[] {
  return LEVELS.flatMap((level) =>
    GENRES.flatMap((genre) =>
      Array.from({ length: perGenre }, (_, i) =>
        makeQuestion({ id: `l${level}-${genre}-${String(i + 1).padStart(2, "0")}`, genre, level }),
      ),
    ),
  );
}

const ALL = makeQuestions(4);

/** 通常モードのリクエストを作る。 */
function normal(level: Level, recentIds: string[] = [], wrongIds: string[] = []): QuestionRequest {
  return { mode: "normal", level, recentIds, wrongIds };
}

describe("chooseQuestions（通常モード）", () => {
  describe("どんな入力でも", () => {
    it("重複しない5問を返す", () => {
      for (let seed = 1; seed <= 100; seed++) {
        const { questions } = chooseQuestions(normal(2), ALL, seededRandom(seed));
        expect(questions).toHaveLength(5);
        expect(new Set(questions.map((q) => q.id)).size).toBe(5);
      }
    });

    it("5問すべて指定した難易度の問題である", () => {
      for (const level of LEVELS) {
        const { questions } = chooseQuestions(normal(level), ALL, seededRandom(level));
        expect(questions.every((q) => q.level === level)).toBe(true);
      }
    });

    it("1〜3番目（通常問題）の教科はすべて異なる", () => {
      for (let seed = 1; seed <= 100; seed++) {
        const { questions } = chooseQuestions(normal(3), ALL, seededRandom(seed));
        expect(new Set(questions.slice(0, 3).map((q) => q.genre)).size).toBe(3);
      }
    });

    it("同じ乱数なら同じ結果を返す", () => {
      const a = chooseQuestions(normal(1), ALL, seededRandom(42));
      const b = chooseQuestions(normal(1), ALL, seededRandom(42));
      expect(a).toEqual(b);
    });

    it("渡された問題一覧を書き換えない", () => {
      const copy = structuredClone(ALL);
      chooseQuestions(normal(1, ["l1-math-01"], ["l1-logic-02"]), ALL, seededRandom(7));
      expect(ALL).toEqual(copy);
    });
  });

  describe("間違えた問題があるとき（優先問題）", () => {
    it("指定した難易度の間違えた問題を、1〜3番目のどこかに必ず含める", () => {
      for (let seed = 1; seed <= 100; seed++) {
        const { questions } = chooseQuestions(
          normal(2, [], ["l2-science-03"]),
          ALL,
          seededRandom(seed),
        );
        expect(questions.slice(0, 3).map((q) => q.id)).toContain("l2-science-03");
      }
    });

    it("最近出た問題でも、間違えた問題なら優先して出す", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const { questions } = chooseQuestions(
          normal(2, ["l2-science-03"], ["l2-science-03"]),
          ALL,
          seededRandom(seed),
        );
        expect(questions.slice(0, 3).map((q) => q.id)).toContain("l2-science-03");
      }
    });

    it("間違えた問題が複数あっても、優先問題は1問だけ（残りは教科の重複なしで選ぶ）", () => {
      // 同じ教科の2問を間違えている場合、通常問題に両方入ることはない
      for (let seed = 1; seed <= 100; seed++) {
        const { questions } = chooseQuestions(
          normal(2, [], ["l2-math-01", "l2-math-02"]),
          ALL,
          seededRandom(seed),
        );
        const mathInNormals = questions.slice(0, 3).filter((q) => q.genre === "math");
        expect(mathInNormals).toHaveLength(1);
      }
    });

    it("他の難易度の間違えた問題は優先しない", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const { questions } = chooseQuestions(
          normal(2, [], ["l1-math-01", "l3-logic-01"]),
          ALL,
          seededRandom(seed),
        );
        expect(questions.every((q) => q.level === 2)).toBe(true);
      }
    });

    it("同じIDが重複して送られても、重複して出さない", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const { questions } = chooseQuestions(
          normal(2, [], ["l2-math-01", "l2-math-01", "l2-math-01"]),
          ALL,
          seededRandom(seed),
        );
        expect(new Set(questions.map((q) => q.id)).size).toBe(5);
      }
    });
  });

  describe("最近出た問題があるとき", () => {
    it("候補が足りていれば、最近出た問題は1問も選ばない", () => {
      // 難易度2の20問のうち、各教科3問（15問）を最近出た扱いにしても、残り5問で足りる
      const recentIds = ALL.filter((q) => q.level === 2 && !q.id.endsWith("-04")).map((q) => q.id);
      for (let seed = 1; seed <= 50; seed++) {
        const { questions } = chooseQuestions(normal(2, recentIds), ALL, seededRandom(seed));
        expect(questions.some((q) => recentIds.includes(q.id))).toBe(false);
      }
    });

    it("候補が足りなければ、最近出た問題も使って5問を選ぶ", () => {
      // 難易度2の問題をすべて最近出た扱いにする
      const recentIds = ALL.filter((q) => q.level === 2).map((q) => q.id);
      const { questions } = chooseQuestions(normal(2, recentIds), ALL, seededRandom(1));
      expect(questions).toHaveLength(5);
      expect(new Set(questions.slice(0, 3).map((q) => q.genre)).size).toBe(3);
    });

    it("一部の教科の候補が0問でも、3教科以上と予備が残っていれば最近出た問題は使わない", () => {
      // 社会・ひらめきを最近出た扱いにしても、国語・算数・理科の12問が残る
      const recentIds = ALL.filter(
        (q) => q.level === 1 && (q.genre === "social" || q.genre === "logic"),
      ).map((q) => q.id);
      const { questions } = chooseQuestions(normal(1, recentIds), ALL, seededRandom(3));
      expect(questions.some((q) => recentIds.includes(q.id))).toBe(false);
      expect(new Set(questions.slice(0, 3).map((q) => q.genre)).size).toBe(3);
    });

    it("新しい候補の教科が2つ以下しか残らないときは、最近出た問題も加えて3教科そろえる", () => {
      const recentIds = ALL.filter(
        (q) => q.level === 1 && q.genre !== "math" && q.genre !== "japanese",
      ).map((q) => q.id);
      const { questions } = chooseQuestions(normal(1, recentIds), ALL, seededRandom(5));
      expect(new Set(questions.slice(0, 3).map((q) => q.genre)).size).toBe(3);
      expect(new Set(questions.map((q) => q.id)).size).toBe(5);
    });

    it("新しい候補が予備を含めて5問に満たないときも、最近出た問題を加えて5問を返す", () => {
      // 新しい候補は 国語・算数・理科 の各1問（計3問）だけ
      const keep = new Set(["l1-japanese-01", "l1-math-01", "l1-science-01"]);
      const recentIds = ALL.filter((q) => q.level === 1 && !keep.has(q.id)).map((q) => q.id);
      const { questions } = chooseQuestions(normal(1, recentIds), ALL, seededRandom(9));
      expect(questions).toHaveLength(5);
      expect(new Set(questions.map((q) => q.id)).size).toBe(5);
    });
  });

  describe("問題が足りないとき", () => {
    it("指定した難易度の問題が5問に満たなければ、エラーを投げる", () => {
      const few = ALL.filter((q) => q.level === 1).slice(0, 4);
      expect(() => chooseQuestions(normal(1), few, seededRandom(1))).toThrow(
        "難易度 1 の問題が足りず、5問を選べません",
      );
    });

    it("指定した難易度の教科が3種類に満たなければ、エラーを投げる", () => {
      const twoGenres = ALL.filter(
        (q) => q.level === 1 && (q.genre === "math" || q.genre === "japanese"),
      );
      expect(() => chooseQuestions(normal(1), twoGenres, seededRandom(1))).toThrow(
        "5問を選べません",
      );
    });
  });
});

describe("chooseQuestions（リベンジモード）", () => {
  const revenge = (wrongIds: string[]): QuestionRequest => ({ mode: "revenge", wrongIds });

  describe("間違えた問題が5問以上あるとき", () => {
    it("ちょうど5問なら、その5問をすべて返す", () => {
      const wrongIds = [
        "l1-math-01",
        "l2-social-02",
        "l3-logic-03",
        "l1-japanese-04",
        "l2-math-01",
      ];
      const { questions, unknownIds } = chooseQuestions(revenge(wrongIds), ALL, seededRandom(1));
      expect(questions.map((q) => q.id).sort()).toEqual([...wrongIds].sort());
      expect(unknownIds).toEqual([]);
    });

    it("5問を超えるときは、間違えた問題の中から重複なしで5問を選ぶ", () => {
      const wrongIds = ALL.filter((q) => q.level === 3).map((q) => q.id); // 20問
      for (let seed = 1; seed <= 50; seed++) {
        const { questions } = chooseQuestions(revenge(wrongIds), ALL, seededRandom(seed));
        expect(questions).toHaveLength(5);
        expect(new Set(questions.map((q) => q.id)).size).toBe(5);
        expect(questions.every((q) => wrongIds.includes(q.id))).toBe(true);
      }
    });

    it("難易度や教科が混ざっていても、そのまま選ぶ（教科の重複なしは使わない）", () => {
      const wrongIds = ALL.filter((q) => q.genre === "math").map((q) => q.id); // 算数だけ12問
      const { questions } = chooseQuestions(revenge(wrongIds), ALL, seededRandom(2));
      expect(questions.every((q) => q.genre === "math")).toBe(true);
    });

    it("recentIds を送られても無視する", () => {
      const wrongIds = ALL.filter((q) => q.level === 1)
        .slice(0, 5)
        .map((q) => q.id);
      const request = { mode: "revenge", wrongIds, recentIds: wrongIds } as QuestionRequest;
      const { questions } = chooseQuestions(request, ALL, seededRandom(1));
      expect(questions).toHaveLength(5);
    });

    it("同じ乱数なら同じ結果を返す", () => {
      const wrongIds = ALL.filter((q) => q.level === 2).map((q) => q.id);
      const a = chooseQuestions(revenge(wrongIds), ALL, seededRandom(11));
      const b = chooseQuestions(revenge(wrongIds), ALL, seededRandom(11));
      expect(a).toEqual(b);
    });
  });

  describe("実在する間違えた問題が5問に満たないとき", () => {
    it("4問なら 409（REVENGE_NOT_AVAILABLE）を投げる", () => {
      const wrongIds = ALL.slice(0, 4).map((q) => q.id);
      const error = catchError(() => chooseQuestions(revenge(wrongIds), ALL, seededRandom(1)));
      expect(error.code).toBe("REVENGE_NOT_AVAILABLE");
      expect(error.httpStatus).toBe(409);
      expect(error.userMessage).toBe("リベンジできる問題が5問に足りません");
    });

    it("0問（wrongIds が空）でも 409 を投げる", () => {
      const error = catchError(() => chooseQuestions(revenge([]), ALL, seededRandom(1)));
      expect(error.httpStatus).toBe(409);
      expect(error.context).toEqual({ unknownIds: [] });
    });

    it("存在しないIDは数えず、unknownIds に入れて返す", () => {
      // 実在4問＋存在しない2問 → 実在が4問なので 409
      const wrongIds = [...ALL.slice(0, 4).map((q) => q.id), "l1-math-99", "l9-x-00"];
      const error = catchError(() => chooseQuestions(revenge(wrongIds), ALL, seededRandom(1)));
      expect(error.context).toEqual({ unknownIds: ["l1-math-99", "l9-x-00"] });
    });

    it("同じIDの重複は1問として数える", () => {
      const wrongIds = ALL.slice(0, 3).flatMap((q) => [q.id, q.id]); // 3問を2回ずつ（6件）
      const error = catchError(() => chooseQuestions(revenge(wrongIds), ALL, seededRandom(1)));
      expect(error.httpStatus).toBe(409);
    });
  });
});

describe("chooseQuestions（存在しない問題IDの扱い）", () => {
  it("通常モードでは、recentIds と wrongIds の存在しないIDを重複なしで返す", () => {
    const { unknownIds, questions } = chooseQuestions(
      normal(1, ["l1-math-99", "l1-math-01"], ["l1-math-99", "l2-logic-77"]),
      ALL,
      seededRandom(1),
    );
    expect(unknownIds).toEqual(["l1-math-99", "l2-logic-77"]);
    expect(questions).toHaveLength(5);
  });

  it("存在しないIDがなければ、空の配列を返す", () => {
    const { unknownIds } = chooseQuestions(normal(1, ["l1-math-01"], []), ALL, seededRandom(1));
    expect(unknownIds).toEqual([]);
  });

  it("存在しない間違えたIDは、優先問題にしない", () => {
    const { questions } = chooseQuestions(normal(1, [], ["l1-math-99"]), ALL, seededRandom(1));
    expect(questions).toHaveLength(5);
  });

  it("リベンジモードで5問以上あるときは、wrongIds の存在しないIDを返す", () => {
    const wrongIds = [...ALL.slice(0, 5).map((q) => q.id), "l1-math-99"];
    const { unknownIds } = chooseQuestions({ mode: "revenge", wrongIds }, ALL, seededRandom(1));
    expect(unknownIds).toEqual(["l1-math-99"]);
  });
});

/** 投げられた AppError を取り出す。投げられなければテストを失敗させる。 */
function catchError(fn: () => unknown): AppError {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("エラーが投げられませんでした");
}
