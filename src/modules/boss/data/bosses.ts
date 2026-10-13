import type { Boss } from "../types";

/**
 * ボスの一覧（表示順）。
 * ID は端末の保存データに使うため、一度付けたら変えない。並びは図鑑の表示順にもなる。
 */
export const BOSSES: readonly Boss[] = [
  { id: "renda-dako", emoji: "🐙", name: "レンダダコ" },
  { id: "misstouch-oni", emoji: "👹", name: "ミスタッチオニ" },
  { id: "keyboard-dragon", emoji: "🐉", name: "キーボードラゴン" },
  { id: "kuuhaku-ghost", emoji: "👻", name: "クウハクゴースト" },
  { id: "henkan-gitsune", emoji: "🦊", name: "ヘンカンギツネ" },
  { id: "nagabun-hebi", emoji: "🐍", name: "ナガブンヘビ" },
  { id: "sakasama-koumori", emoji: "🦇", name: "サカサマコウモリ" },
  { id: "uchi-machigaeru", emoji: "🐸", name: "ウチマチガエル" },
  { id: "mekakushi-fukurou", emoji: "🦉", name: "メカクシフクロウ" },
  { id: "doujioshi-guma", emoji: "🐻", name: "ドウジオシグマ" },
  { id: "karamari-gumo", emoji: "🕷️", name: "カラマリグモ" },
  { id: "typing-saurus", emoji: "🦖", name: "タイピングザウルス" },
  { id: "seikaku-robo", emoji: "🤖", name: "セイカクロボ" },
  { id: "noroyubi-zombie", emoji: "🧟", name: "ノロユビゾンビ" },
  { id: "hitosashi-sasori", emoji: "🦂", name: "ヒトサシサソリ" },
  { id: "hayauchi-zame", emoji: "🦈", name: "ハヤウチザメ" },
  { id: "banban-gorilla", emoji: "🦍", name: "バンバンゴリラ" },
  { id: "ichimoji-maimai", emoji: "🐌", name: "イチモジマイマイ" },
  { id: "keyin-invader", emoji: "👾", name: "キーインベーダー" },
  { id: "delete-wani", emoji: "🐊", name: "デリートワニ" },
];
