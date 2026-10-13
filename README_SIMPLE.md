# はじめての方へ（かんたん版）

**クイズモンスター**は、小学4〜6年生が 3択クイズに答えてボスモンスターを倒す、スマホ向けの学習ゲームです。

詳しい説明は [`README.md`](README.md) にあります。ここでは、手元で動かすまでの 2 ステップだけを案内します。

## 手元で動かす 2 ステップ

### 1. 必要な部品をそろえる

```bash
pnpm install
```

Node.js はバージョン 22 を使います。くわしい条件は [`README.md`](README.md) の「セットアップ」にあります。

### 2. 開発サーバーを起動する

```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開くと画面が出ます。止めるときはターミナルで `Ctrl + C` を押します。

## よく使うコマンド

```
pnpm install        # 必要な部品をそろえる
pnpm dev            # 開発サーバーを起動する
pnpm build          # 本番用に組み立てる
pnpm start          # 組み立てたものを起動する
pnpm lint           # 書き方のチェック
pnpm format:check   # 整形のチェック
pnpm typecheck      # 型のチェック
pnpm test           # テストの実行
pnpm test:e2e       # 画面操作のテスト
```

## AIエージェントで開発する

このリポジトリは、Claude Code / Codex / GitHub Copilot のどれでも同じルールで開発できます。ルールは [`AGENTS.md`](AGENTS.md) の 1 か所にまとめてあり、各 AI の指示書からはそこを読ませるだけにしています。

| AI | 最初に読まれるファイル |
| --- | --- |
| Claude Code | [`CLAUDE.md`](CLAUDE.md) |
| Codex | [`AGENTS.md`](AGENTS.md) |
| GitHub Copilot | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |

## 困ったときは

| 知りたいこと | 見る場所 |
| --- | --- |
| 全体の説明・CI・ドキュメントの一覧 | [`README.md`](README.md) |
| Git の使い方（変更を反映する手順） | [`docs/development/gitの操作ルール.md`](docs/development/gitの操作ルール.md) |
| AI に何を許可しているか | [`docs/agent_permissions.md`](docs/agent_permissions.md) |
| いま何が残っているか | [`docs/todo/TODO.md`](docs/todo/TODO.md) |
