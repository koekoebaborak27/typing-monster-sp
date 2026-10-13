# ローカル開発環境の補足

ローカル開発環境（Node.js・pnpm・Next.js）の設定値と、出ても問題ない警告をまとめる。

## 目次

- [2026-10-08 バージョンの確認](#2026-10-08-バージョンの確認)
- [2026-10-08 出ても問題ない警告](#2026-10-08-出ても問題ない警告)

## 2026-10-08 バージョンの確認

Node.js は `.nvmrc`（24）、pnpm は `package.json` の `packageManager`（10.15.1）に合わせる。

```powershell
node -v
pnpm -v
```

## 2026-10-08 出ても問題ない警告

| 警告 | 理由 | 対応 |
| --- | --- | --- |
| `Update available! 10.15.1 → 12.x` | pnpm の新しい版の案内。CI も 10.15.1 で動かしているので、上げると手元と CI がずれる | 何もしない。上げるときは `package.json` の `packageManager` を変える PR を作る |
| `deprecated eslint@9.x` | ESLint 9 のサポート終了の案内。いまは問題なく動く | [残っているタスク](../TODO.md#残っているタスク)で ESLint 10 へ上げる |
| `Ignored build scripts: unrs-resolver` | インストール時に動くプログラムを pnpm が止めた。通常の Windows / Linux 環境では不要な処理 | `package.json` の `pnpm.ignoredBuiltDependencies` に入れて、警告が出ないようにした |
