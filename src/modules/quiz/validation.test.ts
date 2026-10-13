/**
 * テストの目的（大項目）
 * 1. 正しいリクエスト（通常・リベンジ）を、使いやすい形に直して返すこと
 * 2. 壊れた内容（本文の形・mode・level・IDの一覧・件数）を 400（VALIDATION_ERROR）で弾くこと
 * 3. 存在しない問題IDや未知のフィールドは弾かず、無視すること
 */
import { describe, it, expect } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import { parseQuestionRequest } from "./validation";

/** 検証でエラーになることを確かめ、投げられた AppError を返す。 */
function parseError(body: unknown): AppError {
  try {
    parseQuestionRequest(body);
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("エラーが投げられませんでした");
}

/** 件数だけが違う、"id-0"〜 の文字列の一覧を作る。 */
const ids = (count: number) => Array.from({ length: count }, (_, i) => `id-${i}`);

describe("parseQuestionRequest", () => {
  describe("通常モードの正しいリクエスト", () => {
    it("全項目が揃っていれば、そのまま返す", () => {
      expect(
        parseQuestionRequest({
          mode: "normal",
          level: 2,
          recentIds: ["l2-math-03"],
          wrongIds: ["l2-social-07"],
        }),
      ).toEqual({
        mode: "normal",
        level: 2,
        recentIds: ["l2-math-03"],
        wrongIds: ["l2-social-07"],
      });
    });

    it.each([1, 2, 3])("level が %i なら受け付ける", (level) => {
      expect(parseQuestionRequest({ mode: "normal", level })).toMatchObject({ level });
    });

    it("recentIds と wrongIds が省略されたら、空の配列にする", () => {
      expect(parseQuestionRequest({ mode: "normal", level: 1 })).toEqual({
        mode: "normal",
        level: 1,
        recentIds: [],
        wrongIds: [],
      });
    });

    it("存在しない問題IDが入っていても弾かない", () => {
      expect(
        parseQuestionRequest({ mode: "normal", level: 1, wrongIds: ["l1-math-99", ""] }),
      ).toMatchObject({ wrongIds: ["l1-math-99", ""] });
    });

    it("未知のフィールドは取り除く", () => {
      expect(parseQuestionRequest({ mode: "normal", level: 1, extra: "x" })).not.toHaveProperty(
        "extra",
      );
    });

    it("recentIds・wrongIds がちょうど500件なら受け付ける", () => {
      const result = parseQuestionRequest({
        mode: "normal",
        level: 1,
        recentIds: ids(500),
        wrongIds: ids(500),
      });
      expect(result).toMatchObject({ recentIds: ids(500), wrongIds: ids(500) });
    });
  });

  describe("リベンジモードの正しいリクエスト", () => {
    it("mode と wrongIds だけを返す", () => {
      expect(parseQuestionRequest({ mode: "revenge", wrongIds: ["l1-math-03"] })).toEqual({
        mode: "revenge",
        wrongIds: ["l1-math-03"],
      });
    });

    it("wrongIds が省略されたら、空の配列にする", () => {
      expect(parseQuestionRequest({ mode: "revenge" })).toEqual({ mode: "revenge", wrongIds: [] });
    });

    it("level・recentIds は取り除き、中身が壊れていても弾かない", () => {
      expect(
        parseQuestionRequest({ mode: "revenge", level: 99, recentIds: "壊れた値", wrongIds: [] }),
      ).toEqual({ mode: "revenge", wrongIds: [] });
    });
  });

  describe("本文の形が壊れているとき", () => {
    it.each([
      ["undefined（JSON として読めなかった）", undefined],
      ["null", null],
      ["配列", []],
      ["文字列", "normal"],
      ["数値", 1],
    ])("%s なら 400 にする", (_name, body) => {
      const error = parseError(body);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.httpStatus).toBe(400);
      expect(error.userMessage).toBe("リクエスト本文は JSON のオブジェクトで指定してください");
    });
  });

  describe("mode が正しくないとき", () => {
    it.each([
      ["無い", {}],
      ["存在しない値", { mode: "hard" }],
      ["数値", { mode: 1 }],
      ["大文字", { mode: "NORMAL" }],
    ])("mode が%sなら 400 にする", (_name, body) => {
      const error = parseError(body);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.httpStatus).toBe(400);
      expect(error.userMessage).toBe("mode は normal か revenge で指定してください");
    });
  });

  describe("通常モードで level が正しくないとき", () => {
    it.each([
      ["無い", undefined],
      ["0", 0],
      ["4", 4],
      ["小数（1.5）", 1.5],
      ['文字列（"1"）', "1"],
      ["null", null],
    ])("level が%sなら 400 にする", (_name, level) => {
      const error = parseError({ mode: "normal", level });
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.httpStatus).toBe(400);
      expect(error.userMessage).toBe("level は 1〜3 で指定してください");
    });
  });

  describe("IDの一覧が正しくないとき", () => {
    it.each(["recentIds", "wrongIds"])("%s が配列でなければ 400 にする", (name) => {
      const error = parseError({ mode: "normal", level: 1, [name]: "l1-math-01" });
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.userMessage).toBe(`${name} は文字列の配列で指定してください`);
    });

    it.each(["recentIds", "wrongIds"])("%s に文字列以外が含まれていたら 400 にする", (name) => {
      const error = parseError({ mode: "normal", level: 1, [name]: ["l1-math-01", 3] });
      expect(error.userMessage).toBe(`${name} は文字列の配列で指定してください`);
    });

    it.each(["recentIds", "wrongIds"])("%s が null なら 400 にする", (name) => {
      expect(parseError({ mode: "normal", level: 1, [name]: null }).httpStatus).toBe(400);
    });

    it.each(["recentIds", "wrongIds"])("%s が501件なら 400 にする", (name) => {
      const error = parseError({ mode: "normal", level: 1, [name]: ids(501) });
      expect(error.httpStatus).toBe(400);
      expect(error.userMessage).toBe(`${name} は 500 件以内で指定してください`);
    });

    it("リベンジモードでも、wrongIds が配列でなければ 400 にする", () => {
      const error = parseError({ mode: "revenge", wrongIds: { 0: "l1-math-01" } });
      expect(error.userMessage).toBe("wrongIds は文字列の配列で指定してください");
    });

    it("リベンジモードでも、wrongIds が501件なら 400 にする", () => {
      const error = parseError({ mode: "revenge", wrongIds: ids(501) });
      expect(error.userMessage).toBe("wrongIds は 500 件以内で指定してください");
    });
  });
});
