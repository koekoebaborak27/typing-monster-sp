# クイズモンスター（quiz-monster）

小学4〜6年生向けの、**3択クイズに答えてボスモンスターを倒す学習ゲーム**です。スマホで遊ぶ Web アプリ（PWA）で、1バトルは約1分です。

- 技術: TypeScript + Next.js（App Router）+ React。パッケージ管理は pnpm
- データ: 問題は `src/modules/quiz/data/questions.json` で管理します。遊んだ記録は端末の localStorage にだけ保存し、DB・ログイン・有料 API は使いません
- デプロイ先: Vercel（Hobby プラン）。本番は `https://quiz-monster-nu.vercel.app`（`main` への push で自動デプロイ）
- いまの進み具合: [`docs/todo/TODO.md`](docs/todo/TODO.md)

## 主な機能

| 画面 | URL | 内容 |
| --- | --- | --- |
| ホーム | `/` | モードと難易度を選んでバトルを始める |
| バトル | `/battle` | 3択クイズに答えてボスを攻撃する |
| 結果 | `/result` | バトルの結果と、勝ち方の評価を表示する |
| ボス図鑑 | `/zukan` | 倒したボスと撃破回数を見る（「図鑑をリセット」で空にもできる） |

ホーム・バトル・結果の画面は実装済みで、ブラウザで通しで遊べます（音つき）。ボス図鑑（`/zukan`）と PWA（ホーム画面への追加・オフライン時の案内ページ）も実装済みです。画面の配置は [`docs/specs/mock/screens.html`](docs/specs/mock/screens.html)、仕様は [`docs/specs/`](docs/specs/README.md) にあります。

## セットアップ

Node.js は [`.nvmrc`](.nvmrc) のバージョン（24）を使います。pnpm は `package.json` の `packageManager` で指定したバージョン（10.15.1）を使います。

```bash
pnpm install
pnpm dev
```

ブラウザで http://localhost:3000 を開くと画面が表示されます。`.env` は必要ありません。

> **pnpm** とは、必要な部品（パッケージ）をプロジェクトの `node_modules/` に取ってくる道具です。パソコン全体には入らないので、プロジェクトごとに別のバージョンを使えます。

## よく使うコマンド

```
pnpm install        # 依存パッケージの取得
pnpm dev            # 開発サーバーの起動（http://localhost:3000）
pnpm build          # 本番用のビルド
pnpm start          # ビルド結果の起動（先に pnpm build が必要）
pnpm lint           # ESLint
pnpm format:check   # Prettier チェック
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest（単体）
pnpm test:e2e       # Playwright（画面操作）
```

## CI（GitHub Actions）

PR と `main` への push で [`.github/workflows/ci.yml`](.github/workflows/ci.yml) が次の順に動きます。`*.md` と `docs/` だけの変更では動きません。

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`

## 本番デプロイ

Vercel（Hobby）にデプロイ済みです。`main` へ push すると、Vercel の GitHub 連携が自動で本番を更新します（GitHub Actions の CI とは別に動きます）。構成と手順は [`docs/specs/99_infra/`](docs/specs/99_infra/README.md) にあります。

## ドキュメント

| 知りたいこと | 見る場所 |
| --- | --- |
| 要件・基本設計・詳細設計 | [`docs/specs/`](docs/specs/README.md) |
| 残タスク・作業の履歴 | [`docs/todo/`](docs/todo/TODO.md) |
| 開発の流れ（ブランチ → PR → CI → マージ） | [`docs/development/gitの操作ルール.md`](docs/development/gitの操作ルール.md) |
| UI / デザインの決まり | [`DESIGN.md`](DESIGN.md) |
| コミット / PR のレビュー観点 | [`REVIEW.md`](REVIEW.md) |
| テストの書き方 | [`TESTING.md`](TESTING.md) |
| `src/` の構造・依存方向 | [`src/AGENTS.md`](src/AGENTS.md) |
| 図（mermaid）の描き方 | [`docs/diagrams.md`](docs/diagrams.md) |

## AIエージェントによる開発

このリポジトリは、Claude Code / Codex / GitHub Copilot のどれを使っても同じルールで開発できるようにしてあります。ルールの正本は [`AGENTS.md`](AGENTS.md) の 1 か所だけで、各ツールの入口ファイルはそこを読ませるだけです。

| ツール | 入口 | スキル（作業手順）の起動 | 権限の設定 |
| --- | --- | --- | --- |
| Claude Code | [`CLAUDE.md`](CLAUDE.md) | `/update-todo` のようなスラッシュコマンド | `.claude/settings.json` |
| Codex | `AGENTS.md` を直接読む | 説明文に合う依頼で自動起動（`.agents/skills/`） | `.codex/rules/project.rules` |
| GitHub Copilot | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Copilot Chat で `/update-todo`（`.github/prompts/`） | `.vscode/settings.json` |

- スキルの手順の正本は [`docs/skills/`](docs/skills/README.md)、許可・禁止コマンドの正本は [`docs/agent_permissions.md`](docs/agent_permissions.md) です。
- 同梱しているスキル: `update-todo`（TODO の更新）/ `push-skip-ci`（CI を動かさずに push）/ `create-unit-test-spec`（単体テスト仕様書の作成）/ `create-vitest-test`（Vitest テストの作成）/ `playwright-evidence-test`（画面操作テストとエビデンスの保存）

この土台は、AI 開発用のひな形（ai-dev-template）から作りました。ひな形のコピー手順は [`docs/development/本テンプレートPJをコピーする方法.md`](docs/development/本テンプレートPJをコピーする方法.md) に残しています。

## ライセンス

MIT（[`LICENSE`](LICENSE)）
