# PWAの詳細

要件は [04_PWA.md](../../01_requirements/common/04_PWA.md)。ここでは要件に無い実装の取り決めだけを決める。

## manifest

`src/app/manifest.ts`（Next.js 標準）で作る。

| 項目 | 値 |
| --- | --- |
| `name` / `short_name` | クイズモンスター |
| `start_url` | `/` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `background_color` / `theme_color` | DESIGN.md の背景色（`globals.css` の値を使う） |
| `icons` | `/icons/icon-192.png`（192×192）、`/icons/icon-512.png`（512×512）。`purpose` は `any` と `maskable` の両方 |

## Service Worker

置き場所は `public/sw.js`（ライブラリは使わない）。

| 対象のリクエスト | 動作 |
| --- | --- |
| `/api/` で始まるもの | 触らない（常にネットワークへ）。出題を保存すると古い問題が出るため |
| ページの移動（`mode: navigate`） | ネットワークを先に試す。失敗したら、あらかじめ保存した `/offline.html` を返す |
| `/_next/static/` と `/icons/` | 保存済みがあればそれを返す。無ければネットワークから取得して保存する（ファイル名にハッシュが付いて内容が変わらないため） |
| 上記以外 | 触らない |

- 保存先の名前は `qm-static-v1`。`activate` のときに、これ以外の名前の保存先を削除する。
- `install` のときに `/offline.html` を保存する。`skipWaiting()` と `clients.claim()` で、更新後すぐ新しい Service Worker に切り替える。
- `/offline.html` の内容は [エラーと特殊表示](02_エラーと特殊表示.md#オフライン用の静的ページ)。`public/` に置いてよいのは、このページと `sw.js`・アイコンのみ（問題データは置かない）。

## 登録

- `layout.tsx` に置いた小さな Client Component が、本番ビルドのときだけ `navigator.serviceWorker.register('/sw.js')` を呼ぶ（開発中の古いキャッシュによる混乱を避けるため）。
- 登録に失敗しても何も表示せず、そのまま遊べるようにする（Service Worker はオフライン表示のためだけに使う）。

## 起動したあとのオフライン

アプリを開いたあとに通信が切れた場合は、画面は動かし続ける。問題を取得するとき（`/battle` の開始時と、結果画面の次の問題の先読み）にだけ [エラーと特殊表示](02_エラーと特殊表示.md#一覧) の「オフライン」を出す。
