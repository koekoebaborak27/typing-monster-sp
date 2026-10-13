import { WORDS } from "./data/words";
import type { Random, Word } from "./types";

/** 1バトルで出す言葉の数。 */
const WORDS_PER_BATTLE = 5;

/**
 * 1バトルで出す5語を選ぶ。
 * 最近出た言葉を除いた中から、等しい確率で、重複しないように選ぶ。返した順が、出す順になる。
 * 乱数は引数で受け取る（画面や localStorage には触れない純粋関数にして、テストで結果を固定できるようにするため）。
 */
export function pickWords(recentIds: readonly string[], random: Random): Word[] {
  // 最近出た言葉と、それ以外に分ける。一覧に無いIDは、どの言葉とも一致しないので無視される。
  const recent = new Set(recentIds);
  const candidates = WORDS.filter((word) => !recent.has(word.id));
  const recentWords = WORDS.filter((word) => recent.has(word.id));

  // ふつうは、最近出ていない言葉だけで5語がそろう。
  const picked = drawWords(candidates, WORDS_PER_BATTLE, random);

  // 5語に満たないとき（言葉の数を減らしたときなど）だけ、足りない分を最近出た言葉から選ぶ。
  const shortage = WORDS_PER_BATTLE - picked.length;
  return shortage > 0 ? [...picked, ...drawWords(recentWords, shortage, random)] : picked;
}

/**
 * 言葉の集まりから、重複しないように決まった数だけランダムに取り出す。
 * 集まりの数が足りないときは、あるだけ全部を返す。
 */
function drawWords(words: readonly Word[], count: number, random: Random): Word[] {
  // 選んだ言葉を取り除いていくので、元の一覧を変えないように写しを作る。
  const rest = [...words];
  const drawn: Word[] = [];
  while (drawn.length < count && rest.length > 0) {
    // 残りの中から1つ選び、同じ言葉を2回選ばないように残りから取り除く。
    const index = Math.floor(random() * rest.length);
    drawn.push(...rest.splice(index, 1));
  }
  return drawn;
}
