import { AppError } from "@/shared/errors/app-error";

type ApiHandler = (request: Request) => Promise<Response>;

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * エラーを API の応答の形に直す。
 * AppError はその内容をそのまま返す。それ以外（想定外のエラー）は、内容を隠して 500 を返す。
 */
function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    // 呼び出し元の想定内の失敗なので、警告として1回だけ残す。
    console.warn(`[api] ${error.code}: ${error.userMessage}`, error.context);

    // 409 では、端末が「まちがえた問題」から消すべきIDを一緒に返す。
    const unknownIds = error.context.unknownIds;
    const body: Record<string, unknown> = {
      error: { code: error.code, message: error.userMessage },
    };
    if (Array.isArray(unknownIds)) body.unknownIds = unknownIds;
    return Response.json(body, { status: error.httpStatus, headers: NO_STORE });
  }

  // 内容は利用者に返さず、ログにだけ残す。
  console.error("[api] INTERNAL_ERROR", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "サーバーでエラーが起きました" } },
    { status: 500, headers: NO_STORE },
  );
}

/**
 * API の入口（Route Handler）をくるむ。
 * 中で投げられたエラーを、ここで1回だけログに残して決まった形の応答に変える。
 */
export function withApi(handler: ApiHandler): ApiHandler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
