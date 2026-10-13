# 01_requirements/ — 要件定義書

機能ごとにディレクトリを作り、その中に要件定義書を置く。

```
01_requirements/
└─ <機能名>/
   └─ 01_<機能名>.md
```

書くこと: 誰が・何のために使うか、対象範囲、機能一覧、権限、非機能要件（性能・セキュリティ・可用性）、対象外とすること。

書かないこと: 画面項目やテーブル定義（基本設計へ）、検討の経緯（`docs/todo/history/` へ）。

## 機能一覧

| ディレクトリ | 内容 |
| --- | --- |
| [`common/`](common/01_概要と対象範囲.md) | 全体（目的・対象範囲・技術と運用・非機能要件・PWA） |
| [`battle/`](battle/01_バトルのルール.md) | バトル（ルール・結果の評価・難易度と出題・ボス・画面イメージ） |
| [`question-data/`](question-data/01_問題データ.md) | 問題データ（`questions.json`） |
| [`question-api/`](question-api/01_出題API.md) | 出題API（Route Handlers） |
| [`local-storage/`](local-storage/01_端末内の保存.md) | 端末内の保存 |
| [`boss-zukan/`](boss-zukan/01_ボス図鑑.md) | ボス図鑑 |
| [`revenge/`](revenge/01_リベンジモード.md) | リベンジモード（復習モード） |
