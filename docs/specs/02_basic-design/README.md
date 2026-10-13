# 02_basic-design/ — 基本設計書

要件定義書（[01_requirements/](../01_requirements/README.md)）で定まっていない部分だけを決める。要件定義にある内容は書き写さない。DB は使わないため、テーブル定義は無い。

```
02_basic-design/
├─ 画面遷移図.md                      ← 全体の画面遷移（.mmd + .svg）
├─ common/                            ← 画面をまたぐ取り決め
├─ battle/                            ← ホーム・バトル・結果の画面
├─ question-api/                      ← 出題API
├─ local-storage/                     ← 端末内の保存
└─ boss-zukan/                        ← ボスのデータ・図鑑
```

## 索引

| ファイル | 内容 |
| --- | --- |
| [画面遷移図.md](画面遷移図.md) | 4画面の遷移図 |
| [common/01_URLと画面遷移.md](common/01_URLと画面遷移.md) | URL構成、画面間の受け渡し、直接開いたとき・再読み込みの動作 |
| [common/02_エラーと特殊表示.md](common/02_エラーと特殊表示.md) | オフライン・取得失敗・保存できないときの文言と条件 |
| [common/03_モジュール構成.md](common/03_モジュール構成.md) | モジュールの分け方、公開API、ファイル構成 |
| [common/04_PWA詳細.md](common/04_PWA詳細.md) | manifest、Service Worker のキャッシュ対象、登録 |
| [battle/01_バトル画面の状態遷移.md](battle/01_バトル画面の状態遷移.md) | バトルの状態と遷移、表示の出し分け |
| [battle/02_結果画面の表示.md](battle/02_結果画面の表示.md) | 結果の作り方、表示の出し分け |
| [battle/03_ホーム画面.md](battle/03_ホーム画面.md) | ホームの表示の出し分けと操作 |
| [battle/04_画面イメージ.md](battle/04_画面イメージ.md) | 参照イメージと、イメージからの変更・追加事項 |
| [question-api/01_出題の選び方.md](question-api/01_出題の選び方.md) | 5問の意味、選ぶ手順、リベンジ、端末側の記録、先読み |
| [question-api/02_APIの入出力.md](question-api/02_APIの入出力.md) | エンドポイント、JSON、検証、エラー |
| [local-storage/01_保存データの形.md](local-storage/01_保存データの形.md) | キー名、JSONの形、保存のタイミング、壊れたデータの扱い |
| [boss-zukan/01_ボスデータと選び方.md](boss-zukan/01_ボスデータと選び方.md) | ボス一覧、選び方、枠ランク、図鑑の並び |

## 書き方

- 各ファイルには、画面の目的・表示項目・操作と遷移先・エラー時の文言のうち、要件定義で決まっていないものを書く。
- **エラーメッセージなどの文言は、実際に表示する文字列をそのまま書く。** 単体テスト仕様書（`docs/test/unit/spec/`）がここから転記するため。
- 図は [docs/diagrams.md](../../diagrams.md) の手順で、`.mmd` と `.svg` を同じディレクトリに置く。
