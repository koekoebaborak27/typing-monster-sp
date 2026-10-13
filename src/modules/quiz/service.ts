import { getQuestions } from "./repository";
import { chooseQuestions } from "./selection";
import type { QuestionRequest, QuestionResponse } from "./types";

/**
 * 出題APIの本体。メモリに読み込んだ問題データから5問を選んで返す。
 * 乱数は本番では Math.random を使う（選び方そのものは selection.ts で、乱数を渡してテストする）。
 */
export function selectQuestions(request: QuestionRequest): QuestionResponse {
  return chooseQuestions(request, getQuestions(), Math.random);
}
