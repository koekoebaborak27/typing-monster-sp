/**
 * 濁点・半濁点・小さい文字のキーを押すたびに、文字が切り替わっていく順番。
 * フリック入力では「は」を打ってからこのキーを押すと「ば」、もう一度押すと「ぱ」になる。
 * 目当ての文字より前にある文字は、打っている途中の形として扱う。
 */
const KEY_CYCLES: readonly string[] = [
  "あぁ",
  "いぃ",
  "うぅゔ",
  "えぇ",
  "おぉ",
  "かが",
  "きぎ",
  "くぐ",
  "けげ",
  "こご",
  "さざ",
  "しじ",
  "すず",
  "せぜ",
  "そぞ",
  "ただ",
  "ちぢ",
  "つっづ",
  "てで",
  "とど",
  "はばぱ",
  "ひびぴ",
  "ふぶぷ",
  "へべぺ",
  "ほぼぽ",
  "やゃ",
  "ゆゅ",
  "よょ",
  "わゎ",
];

/**
 * 入力欄の末尾にある、打っている途中のローマ字を取り出すための形。
 * パソコンのローマ字入力では、「さ」になる前の「s」や、「きょ」になる前の「ky」が入力欄に入る（全角で入る機種もある）。
 * いちばん長い打ち方（「っ」の xtsu など）でも 4 文字なので、それより長い英字は途中の形として扱わない。
 */
const ROMAJI_TAIL = /[a-zA-Zａ-ｚＡ-Ｚ]+$/;
const MAX_ROMAJI_LENGTH = 4;

/** 入力欄の中身をお題と比べた結果。 */
export type JudgeResult = {
  /** お題の先頭から、正しく打てている文字数。 */
  confirmed: number;
  /** 打っている途中の形（「が」を打つ途中の「か」、ローマ字入力の「s」など）。無ければ空文字。 */
  pending: string;
  /** お題と違う文字が入っていたら true。 */
  missed: boolean;
};

/**
 * 打った文字が、目当ての文字を打つ途中の形かどうかを調べる。
 * 例: 目当てが「ぱ」なら「は」「ば」は途中の形。目当てが「は」なら途中の形は無い。
 */
export function isHalfwayForm(targetChar: string, typedChar: string): boolean {
  const cycle = KEY_CYCLES.find((chars) => chars.includes(targetChar));
  if (!cycle) return false;
  const typedAt = cycle.indexOf(typedChar);
  return typedAt !== -1 && typedAt < cycle.indexOf(targetChar);
}

/**
 * 入力欄の中身をお題と先頭から比べ、どこまで正しく打てているかを返す。
 * 画面には依存しない。入力欄の中身が変わるたびに呼び、ミスなら呼んだ側が `confirmed` 文字目までに戻す。
 */
export function judgeInput(target: string, value: string): JudgeResult {
  // 末尾のローマ字は、ひらがなになるまで判定を待つ。先にそれより前の部分だけをお題と比べる。
  const romaji = ROMAJI_TAIL.exec(value)?.[0] ?? "";
  if (romaji) {
    const kanaPart = judgeKana(target, value.slice(0, value.length - romaji.length));
    // ローマ字が長すぎる（日本語入力がオフのまま打ち続けた等）、お題をもう打ち終えている、
    // 前の文字が途中の形のまま、のどれかならミスにする。
    const canWait =
      !kanaPart.missed &&
      kanaPart.pending === "" &&
      kanaPart.confirmed < target.length &&
      romaji.length <= MAX_ROMAJI_LENGTH;
    return canWait
      ? { confirmed: kanaPart.confirmed, pending: romaji, missed: false }
      : { confirmed: kanaPart.confirmed, pending: "", missed: true };
  }
  return judgeKana(target, value);
}

/** ローマ字を含まない入力欄の中身を、お題と先頭から比べる。 */
function judgeKana(target: string, value: string): JudgeResult {
  for (let i = 0; i < value.length; i++) {
    if (value[i] === target[i]) continue;

    // 途中の形として認めるのは、いちばん最後の 1 文字だけ。
    // 途中の形のまま次の文字を打った場合（「が」のところで「かき」）は、ミスにする。
    const isLast = i === value.length - 1;
    if (isLast && i < target.length && isHalfwayForm(target[i], value[i])) {
      return { confirmed: i, pending: value[i], missed: false };
    }

    // お題と違う文字、またはお題より長く打った場合。
    return { confirmed: i, pending: "", missed: true };
  }
  return { confirmed: value.length, pending: "", missed: false };
}
