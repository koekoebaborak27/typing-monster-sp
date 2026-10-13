# APIの入出力

要件は [出題API](../../01_requirements/question-api/01_出題API.md)。選び方は [出題の選び方](01_出題の選び方.md)。

## エンドポイント

`POST /api/questions`（`src/app/api/questions/route.ts`）

- リクエスト本文が長くなる（IDの一覧）ため、GET ではなく POST にする。
- 認証・キャッシュは無し。レスポンスには `Cache-Control: no-store` を付ける。

## リクエスト

`Content-Type: application/json`。

通常モード:

```json
{ "mode": "normal", "level": 2, "recentIds": ["l2-math-03"], "wrongIds": ["l2-social-07"] }
```

リベンジモード:

```json
{ "mode": "revenge", "wrongIds": ["l1-math-03", "l2-social-07"] }
```

| 項目 | 型 | 必須 | 内容 |
| --- | --- | --- | --- |
| `mode` | `"normal"` \| `"revenge"` | 必須 | モード |
| `level` | `1` \| `2` \| `3` | 通常モードのみ必須 | 難易度。リベンジモードでは無視する |
| `recentIds` | `string[]` | 通常モードのみ | 選んだ難易度の最近出た問題ID。省略時は空。リベンジモードでは無視する |
| `wrongIds` | `string[]` | 任意 | まちがえた問題ID（全難易度）。省略時は空 |

## 入力の検証（`validation.ts`）

400 にするのは、次のように**送られた内容そのものが壊れている**場合だけ。

| 条件 | 400 にする理由 |
| --- | --- |
| 本文が JSON として読めない／オブジェクトではない | 形が壊れている |
| `mode` が `"normal"` `"revenge"` 以外 | 存在しない値 |
| 通常モードで `level` が無い、または 1・2・3 以外（整数でない場合を含む） | 存在しない値 |
| `recentIds` / `wrongIds` が配列ではない、または文字列以外を含む | 一覧の形ではない |
| `recentIds` / `wrongIds` が500件を超える | 異常な大きさ（問題は240問で、正常な送信は最大でもこの範囲に収まる） |

- 存在しない問題IDは 400 にしない（[存在しない問題IDの扱い](../../01_requirements/question-api/01_出題API.md#存在しない問題idの扱い)）。
- 未知のフィールドは無視する。

## 成功の応答（200）

```json
{
  "questions": [ { "id": "l2-math-01", "genre": "math", "level": 2, "question": "…", "choices": [{ "id": "c1", "text": "…" }, { "id": "c2", "text": "…" }, { "id": "c3", "text": "…" }], "answer": "c2", "explanation": "…" } ],
  "unknownIds": ["l1-math-99"]
}
```

| 項目 | 内容 |
| --- | --- |
| `questions` | 5問。並びの意味は [返す5問の意味](01_出題の選び方.md#返す5問の意味)。1問の形は `questions.json` と同じ（`grade` は画面で使わないため含めない） |
| `unknownIds` | `recentIds` と `wrongIds` のうち `questions.json` に無かったID（重複は除く）。無ければ空の配列 |

## エラーの応答

エラーは `shared/errors/app-error.ts` の `AppError` を投げ、境界（API用ラッパー）が次の形に変換する。

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "level は 1〜3 で指定してください" } }
```

| HTTP | `code` | 場面 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 上の検証に当てはまった。`message` は問題の項目名がわかる文（画面には出さない） |
| 405 | （Next.js 標準） | POST 以外のメソッド |
| 409 | `REVENGE_NOT_AVAILABLE` | リベンジモードで、実在する `wrongIds` が5問未満 |
| 500 | `INTERNAL_ERROR` | 想定外のエラー。内容は返さず、ログにだけ残す |

### 409 の応答

端末が持つ「まちがえた問題」から、削除された問題が消えて5問未満になった場合の応答。`unknownIds` を返し、端末はそれを消してホームへ戻す。

```json
{ "error": { "code": "REVENGE_NOT_AVAILABLE", "message": "…" }, "unknownIds": ["l1-math-99"] }
```

## 型定義

`quiz/types.ts` に置く。リクエストは `QuestionRequest`（`mode` で判別する型）、応答は `QuestionResponse`、1問は `Question`。クライアントとサーバーで同じ型を使う（クライアントからは `import type` のみ）。
