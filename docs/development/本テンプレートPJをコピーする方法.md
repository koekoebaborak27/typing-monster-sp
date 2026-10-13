# 本テンプレートPJをコピーする方法

新しいプロジェクトを始めるときに、このテンプレート（`ai-dev-template`）から新しいリポジトリを作る手順。**「リポジトリをどう作るか」がこのファイルの範囲**で、コピー後の中身の書き換え（`AGENTS.md` のプレースホルダなど）は [`README.md`](../../README.md)「新規プロジェクトへのコピー方法」の 2 番以降を参照。

## どちらの方法を使うか

**通常は方法A**を使う。`ai-dev-template` は GitHub 側で「テンプレートリポジトリ」に設定済み（2026-09-04 完了）なので、方法Aはすぐ使える状態にある。方法Bは、その機能が使えない場面（GitHub 以外の Git サーバーに置く等）のために残してある。

| | 方法A（通常はこちら） | 方法B（例外用） |
|---|---|---|
| どんなときに使うか | GitHub 上に新しいリポジトリを作る、ふだんのケース | GitHub 以外（社内 Git サーバー等）に置く、テンプレート機能を使えない・使いたくない |
| 必要なもの | ブラウザ（`gh` があればコマンド1回で済む） | ブラウザ + `git` コマンド |
| 履歴 | テンプレートの中身を持つ新規1コミット | 手元で作り直すので、これも新規1コミット |
| 手数 | コマンド1回、またはブラウザ操作＋clone | ブラウザ操作＋コマンド数回 |
| 事前準備 | 不要（設定済み。詳細は方法Aの末尾） | 無し |

---

## 方法A: GitHub の「テンプレートリポジトリ」機能を使う（通常はこちら）

GitHub には、あるリポジトリを「テンプレート」に指定しておくと、そこから**コミット履歴を持たない新しいリポジトリ**をワンクリック（または1コマンド）で作れる機能がある。`ai-dev-template` はこの機能を使う前提で作ってあり、設定も済んでいる。

`gh`（GitHub CLI）が使えるなら A-1、ブラウザだけで済ませたいなら A-2 を使う。どちらでも結果は同じ。

### A-1. gh CLI を使う場合（最短）

新しいプロジェクトを作るたびに、次の**1コマンドだけ**でよい。

```bash
cd C:/work/code/kojin_learn
```

まず作業したい場所（新しいリポジトリのフォルダをこの直下に作る）へ移動する。

```bash
gh repo create koekoebaborak27/<新しいリポジトリ名> --private --template koekoebaborak27/ai-dev-template --clone
```

このコマンドが行うこと:

| 部分 | 意味 |
|---|---|
| `koekoebaborak27/<新しいリポジトリ名>` | GitHub 上に作る新しいリポジトリの場所。`<新しいリポジトリ名>` は例えば `family-todo` のように置き換える |
| `--private` | 非公開で作る。公開してよいなら `--public` に変える |
| `--template koekoebaborak27/ai-dev-template` | このリポジトリの中身をコピー元にする |
| `--clone` | GitHub 上に作成した直後、カレントディレクトリ（`C:/work/code/kojin_learn`）の下に同名フォルダとしてそのままクローンする |

実行すると `C:/work/code/kojin_learn/<新しいリポジトリ名>/` が作られ、その中に `ai-dev-template` の最新コミットの中身がコピーされた**新規の1コミット**が入った状態になる。`git remote` も自動的に GitHub 側へ設定済みなので、`git remote add` は不要。

```bash
cd C:/work/code/kojin_learn/<新しいリポジトリ名>
```

```bash
git log --oneline -1 && git remote -v
```

コミットが1件だけあり、`origin` が新しいリポジトリの URL を指していれば成功。ここから [`README.md`](../../README.md) の「新規プロジェクトへのコピー方法」2番以降（プレースホルダの書き換え等）へ進む。

### A-2. gh CLI を使わない場合（ブラウザの「Use this template」ボタン）

`gh` を使わなくても、ブラウザだけで同じことができる。

1. ブラウザで https://github.com/koekoebaborak27/ai-dev-template を開く。
2. 緑色の **「Use this template」** ボタン → **「Create a new repository」** を選ぶ。
3. 案内画面で以下を入力する。

| 項目 | 入力・選択する内容 |
|---|---|
| Owner | `koekoebaborak27`（自分のアカウント） |
| Repository name | 新しいプロジェクトの名前（例: `family-todo`） |
| Description | 任意 |
| Public / Private | 公開してよいものだけ Public。迷ったら Private |
| Include all branches | チェックしない（`ai-dev-template` は `main` しか無いので不要） |

4. 緑色の **「Create repository」** ボタンを押す。これで GitHub 上に、テンプレートの中身を持つ新しい1コミットのリポジトリができる。
5. 作成後のページに表示される clone 用の URL（`git@github.com:koekoebaborak27/<新しいリポジトリ名>.git` または `https://github.com/koekoebaborak27/<新しいリポジトリ名>.git`）を控え、手元へ持ってくる。

```bash
cd C:/work/code/kojin_learn
```

```bash
git clone git@github.com:koekoebaborak27/<新しいリポジトリ名>.git
```

SSH 鍵を設定していない場合は、代わりに HTTPS の URL を使う。

```bash
git clone https://github.com/koekoebaborak27/<新しいリポジトリ名>.git
```

```bash
cd <新しいリポジトリ名>
```

以降は A-1 と同じく、[`README.md`](../../README.md) の 2 番以降へ進む。

### 補足: テンプレートリポジトリ設定について（対応済み・再実行は不要）

方法Aを使うには `ai-dev-template` 側が「テンプレートリポジトリ」に設定されている必要があるが、**この設定は 2026-09-04 に実施済み**なので、新しいプロジェクトを作るたびにやり直す必要はない。以下は、設定が外れた場合や、別のテンプレートを新しく作る場合のための記録。

```bash
gh repo edit koekoebaborak27/ai-dev-template --template
```

このコマンドは、GitHub の当該リポジトリの Settings にある「Template repository」というチェックボックスを ON にする。ON にすると、リポジトリのトップページに緑色の **「Use this template」** ボタンが現れ、`gh repo create` の `--template` オプションが使えるようになる。

**確認方法**: ブラウザで https://github.com/koekoebaborak27/ai-dev-template を開き、緑色の「Use this template」ボタンが表示されていれば設定できている。

---

## 方法B: テンプレートリポジトリ機能を使わない（完全手動）

次のような場合に使う。ふだんは方法Aでよい。

- GitHub 以外の場所（社内 Git サーバー等）にプロジェクトを作りたい
- コピー元をテンプレート化したくない、またはテンプレート化されていないリポジトリを元にしたい
- 「Use this template」が使えない環境にいる

やることは、`git clone` で中身だけを持ってきて、履歴を作り直すこと。

### B-1. テンプレートの中身だけを、履歴を持たずに手元へコピーする

`--depth 1` を付けて浅く（最新コミットだけ）clone し、あとで `.git` ごと消すことで、`ai-dev-template` 側のコミット履歴を引き継がないようにする。

```bash
cd C:/work/code/kojin_learn
```

```bash
git clone --depth 1 https://github.com/koekoebaborak27/ai-dev-template.git <新しいリポジトリ名>
```

```bash
cd <新しいリポジトリ名>
```

### B-2. テンプレート側の Git 履歴を切り離す

```bash
rm -rf .git
```

`.git` フォルダを消すと、そのフォルダは「ただのファイルの集まり」に戻る（`ai-dev-template` への参照が一切無くなる）。

```bash
git init
```

このフォルダを新しい Git リポジトリとして初期化する。

### B-3. 置き先に空のリポジトリを作る

GitHub の場合は、ブラウザで https://github.com/new を開き、次のとおり入力する。GitHub 以外の Git サーバーを使う場合も、「空のリポジトリを作る（初期ファイルを何も入れない）」という点は同じ。

| 項目 | 入力・選択する内容 |
|---|---|
| Owner | `koekoebaborak27` |
| Repository name | `<新しいリポジトリ名>`（B-1 で使ったものと同じにする） |
| Public / Private | 用途に応じて選ぶ |
| Initialize this repository with | **すべてチェックを外す**（README・.gitignore・license のいずれも追加しない） |

**「Initialize this repository with」を1つでもチェックすると、あとの push が衝突するので必ず外す。**

「Create repository」を押す。

### B-4. コミットして push する

```bash
git add -A
```

```bash
git commit -m "chore: ai-dev-templateから新規プロジェクトを作成する"
```

```bash
git branch -M main
```

このフォルダの既定ブランチ名を `main` に揃える（`git init` 直後のブランチ名は環境によって `master` になることがあるため）。

```bash
git remote add origin https://github.com/koekoebaborak27/<新しいリポジトリ名>.git
```

SSH を使う場合はこちら。

```bash
git remote add origin git@github.com:koekoebaborak27/<新しいリポジトリ名>.git
```

```bash
git push -u origin main
```

### B-5. 反映されたか確認する

```bash
git log --oneline -1 --decorate
```

`(HEAD -> main, origin/main)` と表示されれば成功。以降は [`README.md`](../../README.md) の 2 番以降へ進む。
