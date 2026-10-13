import { z } from "zod";
import type { Question } from "./types";
import rawQuestions from "./data/questions.json";

/** 問題データ1問の形。`grade` は画面で使わないため読み込まず、ここで落とす。 */
const questionSchema = z
  .object({
    id: z.string().regex(/^l[123]-(japanese|math|science|social|logic)-\d{2}$/),
    genre: z.enum(["japanese", "math", "science", "social", "logic"]),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    question: z.string().min(1),
    choices: z
      .tuple([
        z.object({ id: z.literal("c1"), text: z.string().min(1) }),
        z.object({ id: z.literal("c2"), text: z.string().min(1) }),
        z.object({ id: z.literal("c3"), text: z.string().min(1) }),
      ])
      .transform((choices): Question["choices"] => [...choices]),
    answer: z.enum(["c1", "c2", "c3"]),
    explanation: z.string().min(1),
  })
  // IDの中の難易度・教科が、項目の値と食い違っていないこと。
  .refine((q) => q.id.startsWith(`l${q.level}-${q.genre}-`), {
    message: "id の難易度・教科が level・genre と一致しません",
  });

/**
 * 問題データを読み込んで形を確認する。
 * 形が壊れていたら、リクエストを受ける前（起動時）に気づけるよう、ここで例外にする。
 */
function loadQuestions(): readonly Question[] {
  return z.array(questionSchema).parse(rawQuestions);
}

// モジュールを読み込んだ時に1回だけ読み、以降はメモリの内容を使い回す。
const questions = loadQuestions();

/** 全問題を返す（読み取り専用）。 */
export function getQuestions(): readonly Question[] {
  return questions;
}
