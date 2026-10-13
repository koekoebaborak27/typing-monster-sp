# 99_infra 01 — Vercel への初回デプロイ

2026-10-09 に実施した手順。アカウント操作（ログイン・2 段階認証）はオーナーが行った。

## 1. アカウントの作成

1. https://vercel.com/signup を開き、プランは **Hobby** を選ぶ。
2. **Continue with GitHub** で `koekoebaborak27` の GitHub からログインする。
3. 2 段階認証の案内が出る。**Set Up Authenticator App** で設定するのが安全（後から Account Settings → Security でも可）。
4. Hobby は無料。カード入力を求められたらプランを間違えているので止める。

## 2. GitHub の連携とインポート

1. ダッシュボード右上の **Add New… → Project** を押す。
2. **Import Git Repository** に `quiz-monster` が出ていなければ、**Adjust GitHub App Permissions** から対象を `Only select repositories` → `quiz-monster` だけにして保存する。
3. `quiz-monster` の **Import** を押し、New Project 画面で次を確認して **Deploy** を押す。
   - Application Preset は Next.js、Root Directory は `./`。
   - Build / Output / Install Command は上書きしない（右端のトグルが OFF のまま）。
   - Environment Variables は空のまま。

> Node.js のバージョン欄は、この New Project 画面には無い。プロジェクトの作成後に **Settings → Build and Deployment → Node.js Version**（左メニューの `Build and Deployment`。`General` ではない）で変える。変更後は **Deployments → 最新の行の `…` → Redeploy** で反映する。

## 3. 本番 URL の確認

プロジェクトの **Overview → Domains** に出る URL が本番 URL。

> **落とし穴**：プロジェクト名どおりの `https://quiz-monster.vercel.app` は**他の人のプロジェクト**（タイトルが「Create Next App」）に取られていた。実際の URL は `quiz-monster-nu.vercel.app`。URL は Overview の Domains で確かめること。

## 4. 本番の動作確認（2026-10-09、Redeploy 後も同じ結果）

```bash
B=https://quiz-monster-nu.vercel.app
for p in / /battle /result /zukan /manifest.webmanifest /sw.js /offline.html; do
  printf "%s " $p; curl -s -o /dev/null -w "%{http_code} %{content_type}\n" $B$p
done
curl -s -o /dev/null -w "API %{http_code}\n" -X POST $B/api/questions \
  -H 'content-type: application/json' -d '{"mode":"normal","level":1}'
```

見方：すべて `200`。`/sw.js` は `application/javascript`、`/manifest.webmanifest` は `application/manifest+json`、API は `200`。API の本文は `mode`（`normal` / `revenge`）と `level`（1〜3）が必要で、足りないと `400`。

| 確認項目 | 結果 |
| --- | --- |
| `/`・`/battle`・`/result`・`/zukan` | 200 |
| `POST /api/questions` | 200（5 問。`Cache-Control: no-store`） |
| `/manifest.webmanifest`・`/sw.js`・`/offline.html`・`/icons/*.png` | 200。`sw.js` は JavaScript で配信 |

## 5. スマホ実機の確認（オーナーが実施）

Android の Chrome で、ホーム画面に追加できること、機内モードで開くと「インターネットにつないでね」が出ることを確認した（オーナーが実施）。

手順：Chrome で本番 URL を開く → `⋮` → **ホーム画面に追加**。先に一度オンラインで数画面開いておき（Service Worker の登録のため）、機内モードにして開き直す。

## 記録を初期化する（実機）

localStorage の記録だけ消したいとき。Chrome の `⋮` → **設定** → **サイトの設定** → **すべてのサイト** → `quiz-monster-nu` → **削除してリセット**。ホーム画面のアイコンから遊ぶ場合も保存先は同じ。消したあとは一度オンラインで開き直して、Service Worker を再登録する。
