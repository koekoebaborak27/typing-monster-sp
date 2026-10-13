/** お題にする言葉1つ。ID は端末の保存データ（最近出た言葉）に使うので、一度付けたら変えない。 */
export type Word = {
  /** 「w-001」の形の連番。 */
  id: string;
  /** お題として表示する、ひらがなの文字列。 */
  text: string;
};

/** 0以上1未満の乱数を返す関数。本番は Math.random、テストでは決まった値を返す関数を渡す。 */
export type Random = () => number;
