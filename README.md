# TimeLine

X（旧 Twitter）をモデルにした SNS タイムラインアプリ。テキスト・画像投稿、いいね、コメント、フォロー、ユーザー検索などのソーシャル機能を備える。

---

## 技術スタック

| 役割 | 技術・バージョン |
|------|----------------|
| フロントエンド | React 19.2.5 + TypeScript 6.0.3 |
| ビルドツール（FE） | Vite 8.0.10 |
| スタイリング | Tailwind CSS 3.4.19 |
| HTTP クライアント | Axios 1.7.9 |
| バックエンド | Spring Boot 4.0.5 |
| 言語 | Java 25 |
| ビルドツール（BE） | Gradle 9.4.1（Kotlin DSL） |
| O/R マッパー | MyBatis Spring Boot Starter 4.0.0 |
| 認証 | JWT（HttpOnly Cookie） |
| データベース | PostgreSQL 16 |
| 画像ストレージ | AWS S3 |
| コンテナ（開発） | Docker Compose v2（PostgreSQL のみ） |
| ホスティング | AWS EC2 + RDS + ALB |

---

## 主な機能

| カテゴリ | 機能 |
|---------|------|
| 認証 | ユーザー登録 / ログイン / ログアウト |
| タイムライン | 全ユーザーの投稿一覧（全てタブ）/ フォロー中ユーザーの投稿一覧（フォロー中タブ） |
| 投稿 | テキスト投稿（最大 280 文字）/ 画像付き投稿 / 投稿削除 |
| いいね | いいね / いいね取り消し / いいね数表示 |
| コメント | コメント投稿 / コメント一覧表示 / コメント削除 |
| フォロー | フォロー / アンフォロー / フォロワー・フォロー中数表示 |
| ユーザー | ユーザー名検索 / プロフィール表示 |

---

## ディレクトリ構成

```
TimeLine/
├── docs/                          # ドキュメント類
│   ├── 要件定義書.md
│   ├── インフラ構成書.md
│   ├── 画面設計書.md
│   ├── 画面遷移図.md
│   ├── DB設計書.md
│   └── 機能定義書/
│       ├── タイムライン機能定義書.md
│       ├── 投稿機能定義書.md
│       ├── いいね機能定義書.md
│       ├── コメント機能定義書.md
│       ├── フォロー機能定義書.md
│       └── ユーザー検索機能定義書.md
├── frontend/                      # React アプリケーション（予定）
├── backend/                       # Spring Boot アプリケーション（予定）
├── db/                            # DB 初期化スクリプト（予定）
└── docker-compose.yml             # ローカル開発用 PostgreSQL（予定）
```

---

## ローカル開発環境のセットアップ

### 前提条件

- Java 25（OpenJDK）
- Node.js 20 以上
- Docker Desktop

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/saki-nakata/TimeLine.git
cd TimeLine

# 2. Docker で PostgreSQL を起動
docker compose up -d

# 3. バックエンド起動
cd backend
./gradlew bootRun

# 4. フロントエンド起動（別ターミナル）
cd frontend
npm install
npm run dev
```

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:5173 |
| バックエンド API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

---

## 主なコマンド

### バックエンド

```bash
./gradlew bootRun      # 開発サーバー起動
./gradlew build        # ビルド
./gradlew test         # テスト実行
./gradlew checkstyleMain  # 静的解析
```

### フロントエンド

```bash
npm run dev            # 開発サーバー起動
npm run build          # 本番ビルド
npm run lint           # ESLint 実行
npm run typecheck      # TypeScript 型チェック
```

---

## 本番環境へのデプロイ

本番環境は AWS EC2 + RDS + ALB + S3 で構成する。インフラの詳細は [docs/インフラ構成書.md](docs/インフラ構成書.md) を参照。

---

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [要件定義書](docs/要件定義書.md) | 機能要件・非機能要件・技術スタック |
| [インフラ構成書](docs/インフラ構成書.md) | AWS 構成・デプロイフロー |
| [DB 設計書](docs/DB設計書.md) | ER 図・テーブル定義 |
| [画面設計書](docs/画面設計書.md) | ワイヤーフレーム（全 6 画面） |
| [画面遷移図](docs/画面遷移図.md) | 画面間の遷移フロー |
| [タイムライン機能定義書](docs/機能定義書/タイムライン機能定義書.md) | タイムライン機能の詳細仕様 |
| [投稿機能定義書](docs/機能定義書/投稿機能定義書.md) | 投稿機能の詳細仕様 |
| [いいね機能定義書](docs/機能定義書/いいね機能定義書.md) | いいね機能の詳細仕様 |
| [コメント機能定義書](docs/機能定義書/コメント機能定義書.md) | コメント機能の詳細仕様 |
| [フォロー機能定義書](docs/機能定義書/フォロー機能定義書.md) | フォロー機能の詳細仕様 |
| [ユーザー検索機能定義書](docs/機能定義書/ユーザー検索機能定義書.md) | ユーザー検索機能の詳細仕様 |
