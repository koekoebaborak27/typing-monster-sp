# PWAの詳細

要件は [04_PWA.md](../../01_requirements/common/04_PWA.md)。ここでは要件に無い実装の取り決めだけを決める。

## manifest

`src/app/manifest.ts`（Next.js 標準）で作る。

| 項目 | 値 |
| --- | --- |
| `name` / `short_name` | タイピングモンスター |
| `start_url` | `/` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `background_color` / `theme_color` | DESIGN.md の背景色（`globals.css` の値を使う） |
| `icons` | `/icons/icon-192.png`（192×192）、`/icons/icon-512.png`（512×512）。`purpose` は `any` と `maskable` の両方 |

## Service Worker

置き場所は `public/sw.js`（ライブラリは使わない）。オフライン用のページを返すためだけに使い、オフラインで遊べるようにはしない。

| 対象のリクエスト | 動作 |
| --- | --- |
| ページの移動（`mode: navigate`） | ネットワークを先に試す。失敗したら、あらかじめ保存した `/offline.html` を返す |
| `/_next/static/` と `/icons/` | 保存済みがあればそれを返す。無ければネットワークから取得して保存する（ファイル名にハッシュが付いて内容が変わらないため） |
| 上記以外 | 触らない |

- 保存先の名前は `qm-static-v1`（クイズモンスターのときのまま）。`activate` のときに、これ以外の名前の保存先を削除する。
- `install` のときに `/offline.html` を保存する。`skipWaiting()` と `clients.claim()` で、更新後すぐ新しい Service Worker に切り替える。
- `/offline.html` の内容は [エラーと特殊表示](02_エラーと特殊表示.md#オフライン用の静的ページ)。`public/` に置いてよいのは、このページと `sw.js`・アイコンのみ。
- ページそのものは保存しない。保存すると、直したものが端末に届かず、古い版が残るため。

## 登録

- `layout.tsx` に置いた小さな Client Component が、本番ビルドのときだけ `navigator.serviceWorker.register('/sw.js')` を呼ぶ（開発中の古いキャッシュによる混乱を避けるため）。
- 登録に失敗しても何も表示せず、そのまま遊べるようにする（Service Worker はオフライン表示のためだけに使う）。

## 起動したあとのオフライン

- バトル中は通信しないので、アプリを開いたあとに通信が切れても、そのバトルは最後まで遊べる。
- 画面を移るとき（結果画面へ・「もう1回」・ホームへ）に、移る先を取得できなかった場合は `/offline.html` が出る。そのバトルの撃破の記録は、結果画面へ移る前に保存しているので残る。
