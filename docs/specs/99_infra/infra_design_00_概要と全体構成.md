# 99_infra 00 — 概要と全体構成

本番は **Vercel（Hobby プラン）** に置く。DB・ログイン・環境変数は使わない。

## 構成

| 項目 | 内容 |
| --- | --- |
| ホスティング | Vercel（Hobby。無料） |
| 本番 URL | `https://quiz-monster-nu.vercel.app`（`quiz-monster` という名前は他人が使用中のため、Vercel が `-nu` を付けた） |
| 連携元 | GitHub `koekoebaborak27/quiz-monster`（公開）の `main` ブランチ |
| 自動デプロイ | Vercel の GitHub 連携による。`main` への push で本番、それ以外のブランチ・PR でプレビュー URL が作られる。GitHub Actions（CI）とは別に動き、CI の成否は待たない |
| 環境変数 | 無し |
| 出題 API | Next.js の Route Handlers（`POST /api/questions`。Vercel のサーバーレス関数として動く） |
| PWA | `/manifest.webmanifest`・`/sw.js`・`/offline.html`。Service Worker は本番ビルドのときだけ登録される |

## プロジェクトの設定値

`vercel.json` は置いていない。Vercel の自動検出に任せている。

| 設定 | 値 |
| --- | --- |
| Application Preset | Next.js（自動検出） |
| Root Directory | `./` |
| Build / Output / Install Command | 既定のまま（上書きしない）。Install は `pnpm-lock.yaml` から `pnpm install` が選ばれる |
| Node.js Version | `package.json` の `engines.node`（`24.x`）で決まる。`.nvmrc`（24）・CI・本番がすべて 24 で揃っている（2026-10-09 に 22 から更新）。画面（Settings → Build and Deployment）の設定より `engines` が優先されるため、`engines` を直す。`>=` の範囲指定にすると新しいメジャー版へ自動で上がる |
| Environment Variables | 設定しない |

## 構築手順の記録

初回デプロイの手順は [`infra_design_01_Vercelへの初回デプロイ.md`](infra_design_01_Vercelへの初回デプロイ.md)。
