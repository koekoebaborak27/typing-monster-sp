import { z } from "zod";
import { Errors } from "@/shared/errors/app-error";
import type { QuestionRequest } from "./types";

// 問題は240問なので、正常な送信は最大でもこの件数に収まる。これを超えるのは異常な大きさ。
const MAX_IDS = 500;

/** 問題IDの一覧の検証ルールを作る。省略されたときは空の一覧として扱う。 */
function idListSchema(name: string) {
  return z
    .array(z.string({ error: `${name} は文字列の配列で指定してください` }), {
      error: `${name} は文字列の配列で指定してください`,
    })
    .max(MAX_IDS, { error: `${name} は ${MAX_IDS} 件以内で指定してください` })
    .default([]);
}

const modeSchema = z.enum(["normal", "revenge"], {
  error: "mode は normal か revenge で指定してください",
});

// 通常モードだけが level・recentIds を使う。未知のフィールドは取り除かれる。
const normalSchema = z.object({
  mode: z.literal("normal"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)], {
    error: "level は 1〜3 で指定してください",
  }),
  recentIds: idListSchema("recentIds"),
  wrongIds: idListSchema("wrongIds"),
});

// リベンジモードは level・recentIds を無視するので、中身が壊れていても検証しない。
const revengeSchema = z.object({
  mode: z.literal("revenge"),
  wrongIds: idListSchema("wrongIds"),
});

/**
 * 出題APIのリクエスト本文を検証して、使いやすい形に直す。
 * 送られた内容そのものが壊れているときだけ、400（VALIDATION_ERROR）にする。
 * 存在しない問題IDはここでは弾かない（出題側で無視して、応答の unknownIds で知らせる）。
 */
export function parseQuestionRequest(body: unknown): QuestionRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw Errors.validation("リクエスト本文は JSON のオブジェクトで指定してください");
  }

  // 先に mode を調べて、モードごとの検証ルールを選ぶ。
  const mode = modeSchema.safeParse((body as Record<string, unknown>).mode);
  if (!mode.success) throw Errors.validation(mode.error.issues[0].message);

  const result = (mode.data === "normal" ? normalSchema : revengeSchema).safeParse(body);
  if (!result.success) throw Errors.validation(result.error.issues[0].message);
  return result.data;
}
