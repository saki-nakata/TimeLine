# TimeLine API 仕様書

**バージョン:** 1.0
**作成日:** 2026-05-26
**作成者:** Nakata Saki

---

## インタラクティブ仕様書（Swagger UI）

API の仕様はコードから自動生成される Swagger UI を参照すること。
リクエスト・レスポンス仕様の確認と実際の API 呼び出しテストが可能。

| リソース | URL |
|---------|-----|
| Swagger UI | `http://localhost:8080/swagger-ui.html` |
| OpenAPI JSON | `http://localhost:8080/v3/api-docs` |
| OpenAPI YAML | `http://localhost:8080/v3/api-docs.yaml` |

---

## 認証方式

| 種別 | Cookie 名 | 有効期限 | Path |
|------|----------|---------|------|
| アクセストークン | `access_token` | 15 分 | `/` |
| リフレッシュトークン | `refresh_token` | 7 日 | `/api/auth` |

認証が必要なエンドポイントへのリクエスト時、ブラウザは `access_token` Cookie を自動送信する。
トークン期限切れ時はフロントエンドが自動的に `POST /api/auth/refresh` を呼び出してリトライする。

### Swagger UI での動作確認手順

1. `http://localhost:8080/swagger-ui.html` を開く
2. **認証** タグの `POST /api/auth/login` を実行してログイン
3. `access_token` Cookie がブラウザにセットされ、以降の認証必要エンドポイントが実行可能になる

---

## ページネーション

タイムライン・ユーザー投稿一覧はカーソルベースのページネーションを採用。

| パラメータ | 型 | デフォルト | 説明 |
|----------|----|----------|------|
| `cursor` | Long | なし（初回） | 前回レスポンスの `nextCursor` を指定 |
| `limit` | int | 20 | 1 回の取得件数 |

---

## 関連ドキュメント

| ドキュメント | ファイル |
|------------|---------|
| 要件定義書 | [要件定義書.md](要件定義書.md) |
| DB 設計書 | [DB設計書.md](DB設計書.md) |
| 認証機能定義書 | [機能定義書/認証機能定義書.md](機能定義書/認証機能定義書.md) |
| シーケンス図 | [シーケンス図.md](シーケンス図.md) |
