/** ボス1体の情報。ID は端末の保存データ（撃破回数）に使うので、一度付けたら変えない。 */
export type Boss = {
  id: string;
  emoji: string;
  name: string;
};

/** 図鑑の枠の色。撃破回数が0回のときは枠が無いので、ランクは null で表す。 */
export type Rank = "bronze" | "silver" | "gold";

/**
 * 結果画面のお知らせ帯（図鑑）に出す内容。
 * new は初めて倒したとき、rankUp は枠の色が上がったとき（上がった先の色を持つ）。
 */
export type ZukanNotice = { kind: "new" } | { kind: "rankUp"; rank: Exclude<Rank, "bronze"> };

/** 0以上1未満の乱数を返す関数。本番は Math.random、テストでは決まった値を返す関数を渡す。 */
export type Random = () => number;
