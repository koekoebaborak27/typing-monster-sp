import { parseQuestionRequest, selectQuestions } from "@/modules/quiz";
import { withApi } from "@/shared/observability/with-api";

/**
 * 出題API（POST /api/questions）。
 * 本文を検証し、5問を選んで返すだけ。選び方や検証の中身は quiz モジュールに任せる。
 */
export const POST = withApi(async (request) => {
  // JSON として読めない本文は undefined にして、検証側で 400 にする。
  const body = await request.json().catch(() => undefined);
  const response = selectQuestions(parseQuestionRequest(body));
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
});
