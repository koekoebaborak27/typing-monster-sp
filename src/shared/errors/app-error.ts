/**
 * 業務コードが投げるエラー。
 * ログや応答への変換は境界（shared/observability のラッパー）が1回だけ行うので、投げる側は try/catch もログも書かない。
 */
export class AppError extends Error {
  /**
   * @param code grep で探せるキー文字列（例: `VALIDATION_ERROR`）
   * @param httpStatus API で返す HTTP の番号
   * @param userMessage 利用者・呼び出し元に見せてよい文
   * @param context 調査用の補足。ログに残す（`unknownIds` が配列なら API の応答にも含める）
   */
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    readonly userMessage: string,
    readonly context: Record<string, unknown> = {},
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}

/**
 * 標準のエラーを作る関数の集まり。
 * 標準にないコードは `new AppError(...)` で独自に作ってよい。
 */
export const Errors = {
  validation: (message: string, context?: Record<string, unknown>) =>
    new AppError("VALIDATION_ERROR", 400, message, context),
  unauthorized: (message: string, context?: Record<string, unknown>) =>
    new AppError("UNAUTHORIZED", 401, message, context),
  forbidden: (message: string, context?: Record<string, unknown>) =>
    new AppError("FORBIDDEN", 403, message, context),
  notFound: (message: string, context?: Record<string, unknown>) =>
    new AppError("NOT_FOUND", 404, message, context),
  conflict: (message: string, context?: Record<string, unknown>) =>
    new AppError("CONFLICT", 409, message, context),
};
