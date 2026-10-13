import { AppError } from "@/shared/errors/app-error";
import type {
  NormalQuestionRequest,
  Question,
  QuestionRequest,
  QuestionResponse,
  RevengeQuestionRequest,
} from "./types";

/** 0以上1未満の乱数を返す関数。本番は Math.random、テストでは決まった値を返す関数を渡す。 */
export type Random = () => number;

const NORMAL_COUNT = 3;
const RESERVE_COUNT = 2;
const TOTAL_COUNT = NORMAL_COUNT + RESERVE_COUNT;

/** 一覧から重複を取り除く（最初に出てきた順を保つ）。 */
function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** 一覧から1つをランダムに選ぶ。 */
function pickOne<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

/** 一覧の並びをランダムに入れ替えた新しい一覧を返す。 */
function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 送られたIDのうち、問題データに無いものを返す（重複なし）。 */
function findUnknownIds(ids: readonly string[], known: ReadonlyMap<string, Question>): string[] {
  return unique(ids).filter((id) => !known.has(id));
}

/**
 * 通常問題3問＋予備問題2問を、候補の中から選ぶ。選べなければ undefined を返す。
 * 3問は教科がすべて異なる。優先問題があれば、候補に含まれていなくても必ず1問目の枠に入れる。
 */
function pickFromPool(
  pool: readonly Question[],
  priorityCandidates: readonly Question[],
  random: Random,
): Question[] | undefined {
  const normals: Question[] = [];
  if (priorityCandidates.length > 0) normals.push(pickOne(priorityCandidates, random));

  while (normals.length < NORMAL_COUNT) {
    // すでに選んだ教科は避け、残りの教科から教科を選んでから、その教科の問題を選ぶ。
    const usedGenres = new Set(normals.map((q) => q.genre));
    const genres = unique(pool.map((q) => q.genre)).filter((genre) => !usedGenres.has(genre));
    if (genres.length === 0) return undefined;
    const genre = pickOne(genres, random);
    normals.push(
      pickOne(
        pool.filter((q) => q.genre === genre),
        random,
      ),
    );
  }

  // 予備問題は、選んだ3問を除いた候補から教科を問わず選ぶ。
  const normalIds = new Set(normals.map((q) => q.id));
  const rest = pool.filter((q) => !normalIds.has(q.id));
  if (rest.length < RESERVE_COUNT) return undefined;

  return [...shuffle(normals, random), ...shuffle(rest, random).slice(0, RESERVE_COUNT)];
}

/** 通常モードの5問を選ぶ。 */
function selectNormal(
  request: NormalQuestionRequest,
  all: readonly Question[],
  known: ReadonlyMap<string, Question>,
  random: Random,
): QuestionResponse {
  // 間違えた問題のうち、この難易度のものを優先問題の候補にする。
  const priorityCandidates = unique(request.wrongIds)
    .map((id) => known.get(id))
    .filter((q): q is Question => q !== undefined && q.level === request.level);

  const levelQuestions = all.filter((q) => q.level === request.level);
  const recent = new Set(request.recentIds);
  const fresh = levelQuestions.filter((q) => !recent.has(q.id));

  // 最近出た問題を除いて選べなければ、最近出た問題も候補に加えて選び直す。
  const questions =
    pickFromPool(fresh, priorityCandidates, random) ??
    pickFromPool(levelQuestions, priorityCandidates, random);
  if (!questions) {
    throw new Error(`難易度 ${request.level} の問題が足りず、${TOTAL_COUNT}問を選べません`);
  }

  return {
    questions,
    unknownIds: findUnknownIds([...request.recentIds, ...request.wrongIds], known),
  };
}

/** リベンジモードの5問を選ぶ。間違えた問題が5問未満なら 409 にする。 */
function selectRevenge(
  request: RevengeQuestionRequest,
  known: ReadonlyMap<string, Question>,
  random: Random,
): QuestionResponse {
  // 実在する、間違えた問題だけを対象にする。難易度は問わない。
  const unknownIds = findUnknownIds(request.wrongIds, known);
  const validQuestions = unique(request.wrongIds)
    .map((id) => known.get(id))
    .filter((q): q is Question => q !== undefined);

  if (validQuestions.length < TOTAL_COUNT) {
    // 端末が削除済みのIDを消せるよう、unknownIds を一緒に返す。
    throw new AppError(
      "REVENGE_NOT_AVAILABLE",
      409,
      `リベンジできる問題が${TOTAL_COUNT}問に足りません`,
      { unknownIds },
    );
  }

  return { questions: shuffle(validQuestions, random).slice(0, TOTAL_COUNT), unknownIds };
}

/**
 * リクエストに合わせて出題する5問を選ぶ。
 * 問題の一覧と乱数を引数で受け取るので、テストでは結果を固定できる。
 */
export function chooseQuestions(
  request: QuestionRequest,
  all: readonly Question[],
  random: Random,
): QuestionResponse {
  const known = new Map(all.map((q) => [q.id, q]));
  return request.mode === "normal"
    ? selectNormal(request, all, known, random)
    : selectRevenge(request, known, random);
}
