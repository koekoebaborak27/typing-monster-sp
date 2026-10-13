import type { Boss } from "../types";

/**
 * ボスの一覧（表示順）。
 * ID は端末の保存データに使うため、一度付けたら変えない。並びは図鑑の表示順にもなる。
 */
export const BOSSES: readonly Boss[] = [
  { id: "ukkari-tako", emoji: "🐙", name: "ウッカリダコ" },
  { id: "hikkake-oni", emoji: "👹", name: "ヒッカケオニ" },
  { id: "nazotoki-dragon", emoji: "🐉", name: "ナゾトキドラゴン" },
  { id: "wasure-ghost", emoji: "👻", name: "ワスレゴースト" },
  { id: "damashi-kitsune", emoji: "🦊", name: "ダマシギツネ" },
  { id: "heritsu-hebi", emoji: "🐍", name: "ヘリクツヘビ" },
  { id: "kanchigai-koumori", emoji: "🦇", name: "カンチガイコウモリ" },
  { id: "keta-machigaeru", emoji: "🐸", name: "ケタマチガエル" },
  { id: "shittaka-fukurou", emoji: "🦉", name: "シッタカフクロウ" },
  { id: "nebosuke-guma", emoji: "🐻", name: "ネボスケグマ" },
  { id: "yomitobashi-gumo", emoji: "🕷️", name: "ヨミトバシグモ" },
  { id: "maruanki-saurus", emoji: "🦖", name: "マルアンキザウルス" },
  { id: "yamakan-robo", emoji: "🤖", name: "ヤマカンロボ" },
  { id: "namake-zombie", emoji: "🧟", name: "ナマケゾンビ" },
  { id: "uroboe-sasori", emoji: "🦂", name: "ウロオボエサソリ" },
  { id: "awate-zame", emoji: "🦈", name: "アワテザメ" },
  { id: "gorioshi-gorilla", emoji: "🦍", name: "ゴリオシゴリラ" },
  { id: "atomawashi-maimai", emoji: "🐌", name: "アトマワシマイマイ" },
  { id: "hatena-invader", emoji: "👾", name: "ハテナインベーダー" },
  { id: "iiwake-wani", emoji: "🐊", name: "イイワケワニ" },
];
