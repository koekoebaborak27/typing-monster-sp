/** 教科 */
export type Genre = "japanese" | "math" | "science" | "social" | "logic";

/** 難易度（1=かんたん / 2=ふつう / 3=むずかしい） */
export type Level = 1 | 2 | 3;

/** 選択肢のID。画面の A / B / C と混同しないよう c1〜c3 とする。 */
export type ChoiceId = "c1" | "c2" | "c3";

/** 問題1問。クライアントとサーバーで同じ形を使う（`grade` は画面で使わないので含めない）。 */
export type Question = {
  id: string;
  genre: Genre;
  level: Level;
  question: string;
  choices: { id: ChoiceId; text: string }[];
  answer: ChoiceId;
  explanation: string;
};

/** 通常モードの出題リクエスト */
export type NormalQuestionRequest = {
  mode: "normal";
  level: Level;
  recentIds: string[];
  wrongIds: string[];
};

/** リベンジモードの出題リクエスト */
export type RevengeQuestionRequest = {
  mode: "revenge";
  wrongIds: string[];
};

/** 出題リクエスト。`mode` で通常とリベンジを見分ける。 */
export type QuestionRequest = NormalQuestionRequest | RevengeQuestionRequest;

/** 出題APIの成功時の応答 */
export type QuestionResponse = {
  /** 5問。1〜3番目が通常問題、4〜5番目が予備問題 */
  questions: Question[];
  /** 送られたIDのうち、問題データに無かったもの（重複なし） */
  unknownIds: string[];
};
