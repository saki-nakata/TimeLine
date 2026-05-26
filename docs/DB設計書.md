# TimeLine DB 設計書

**バージョン:** 1.2
**作成日:** 2026-05-17
**更新日:** 2026-05-24
**作成者:** Nakata Saki

---

## 1. 概要

本ドキュメントでは TimeLine アプリの PostgreSQL データベース設計を定義する。

### 設計方針

- 画像は URL 参照（VARCHAR）として保存。バイナリは AWS S3 に保存し、DB には持たない。
- `post_likes` テーブルの複合主キー `(post_id, user_id)` により、1 ユーザー 1 投稿につき 1 いいねを DB レベルで強制する。
- `user_follows` テーブルの複合主キー `(follower_id, following_id)` により、重複フォローを防ぐ。
- `posts.like_count` / `posts.comment_count` / `users.follower_count` / `users.following_count` は非正規化カウンタとし、集計コストを削減する。カウンタはサービス層で `+1/-1` 更新する。
- `users` テーブルは `password_hash`（メール認証）と `oauth_provider / oauth_id`（OAuth）の両列を持ち、認証方式の後決めに対応する。
- 主キーはすべて `BIGSERIAL`（自動採番 64-bit 整数）を使用する。
- タイムスタンプはすべて `TIMESTAMP WITH TIME ZONE`（`TIMESTAMPTZ`）を使用する。

---

## 2. ER 図

```mermaid
erDiagram
    users {
        BIGSERIAL id PK
        VARCHAR(50) username UK "NOT NULL"
        VARCHAR(100) display_name "NULLABLE"
        VARCHAR(255) email UK "NOT NULL"
        VARCHAR(255) password_hash "NULLABLE"
        VARCHAR(50) oauth_provider "NULLABLE"
        VARCHAR(255) oauth_id "NULLABLE"
        VARCHAR(500) avatar_url "NULLABLE"
        TEXT bio "NULLABLE"
        BIGINT follower_count "NOT NULL DEFAULT 0"
        BIGINT following_count "NOT NULL DEFAULT 0"
        TIMESTAMPTZ created_at "NOT NULL DEFAULT NOW()"
        TIMESTAMPTZ updated_at "NOT NULL DEFAULT NOW()"
    }

    posts {
        BIGSERIAL id PK
        BIGINT user_id FK "NOT NULL"
        TEXT content "NULLABLE"
        VARCHAR(500) image_url "NULLABLE"
        BIGINT like_count "NOT NULL DEFAULT 0"
        BIGINT comment_count "NOT NULL DEFAULT 0"
        TIMESTAMPTZ created_at "NOT NULL DEFAULT NOW()"
        TIMESTAMPTZ updated_at "NOT NULL DEFAULT NOW()"
    }

    comments {
        BIGSERIAL id PK
        BIGINT post_id FK "NOT NULL"
        BIGINT user_id FK "NOT NULL"
        TEXT content "NOT NULL"
        TIMESTAMPTZ created_at "NOT NULL DEFAULT NOW()"
        TIMESTAMPTZ updated_at "NOT NULL DEFAULT NOW()"
    }

    post_likes {
        BIGINT post_id FK "NOT NULL, PK"
        BIGINT user_id FK "NOT NULL, PK"
        TIMESTAMPTZ created_at "NOT NULL DEFAULT NOW()"
    }

    user_follows {
        BIGINT follower_id FK "NOT NULL, PK"
        BIGINT following_id FK "NOT NULL, PK"
        TIMESTAMPTZ created_at "NOT NULL DEFAULT NOW()"
    }

    users ||--o{ posts : "writes"
    users ||--o{ comments : "writes"
    users ||--o{ post_likes : "gives"
    users ||--o{ user_follows : "follows (follower)"
    users ||--o{ user_follows : "followed by (following)"
    posts ||--o{ comments : "has"
    posts ||--o{ post_likes : "receives"
```

---

## 3. テーブル定義書

### 3.1 users テーブル

ユーザー情報を管理するテーブル。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | BIGSERIAL | NOT NULL | 自動採番 | 主キー |
| username | VARCHAR(50) | NOT NULL | — | ユーザー名（@username）。一意 |
| display_name | VARCHAR(100) | NULLABLE | — | 表示名。未設定の場合は username を表示 |
| email | VARCHAR(255) | NOT NULL | — | メールアドレス。一意 |
| password_hash | VARCHAR(255) | NULLABLE | — | bcrypt ハッシュ。OAuth のみの場合は NULL |
| oauth_provider | VARCHAR(50) | NULLABLE | — | OAuth プロバイダー名（例: `google`） |
| oauth_id | VARCHAR(255) | NULLABLE | — | OAuth プロバイダー側のユーザー ID |
| avatar_url | VARCHAR(500) | NULLABLE | — | アバター画像の URL（開発: ローカルファイルシステム、本番: AWS S3） |
| bio | TEXT | NULLABLE | — | 自己紹介文 |
| follower_count | BIGINT | NOT NULL | 0 | フォロワー数（非正規化カウンタ） |
| following_count | BIGINT | NOT NULL | 0 | フォロー中ユーザー数（非正規化カウンタ） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 登録日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新日時 |

**制約:**

| 制約名 | 種別 | 対象カラム | 内容 |
|--------|------|-----------|------|
| users_pkey | PRIMARY KEY | id | — |
| users_username_key | UNIQUE | username | ユーザー名の重複不可 |
| users_email_key | UNIQUE | email | メールアドレスの重複不可 |
| users_oauth_key | UNIQUE | (oauth_provider, oauth_id) | OAuth の重複不可 |

---

### 3.2 posts テーブル

ユーザーの投稿を管理するテーブル。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | BIGSERIAL | NOT NULL | 自動採番 | 主キー |
| user_id | BIGINT | NOT NULL | — | 投稿者の users.id（外部キー） |
| content | TEXT | NULLABLE | — | 投稿テキスト（最大 280 文字）。image_url と少なくとも一方が非 NULL であること（アプリ層で強制） |
| image_url | VARCHAR(500) | NULLABLE | — | 投稿画像の S3 URL。content と少なくとも一方が非 NULL であること |
| like_count | BIGINT | NOT NULL | 0 | いいね数（非正規化カウンタ） |
| comment_count | BIGINT | NOT NULL | 0 | コメント数（非正規化カウンタ） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 投稿日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新日時 |

**制約:**

| 制約名 | 種別 | 対象カラム | 内容 |
|--------|------|-----------|------|
| posts_pkey | PRIMARY KEY | id | — |
| posts_user_id_fkey | FOREIGN KEY | user_id → users(id) | ON DELETE CASCADE |

**インデックス:**

| インデックス名 | 対象カラム | 目的 |
|--------------|-----------|------|
| idx_posts_user_id | user_id | プロフィール画面の投稿一覧取得 |
| idx_posts_created_at | created_at DESC | タイムラインの新着順ソート |

---

### 3.3 comments テーブル

投稿に対するコメントを管理するテーブル。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | BIGSERIAL | NOT NULL | 自動採番 | 主キー |
| post_id | BIGINT | NOT NULL | — | 対象投稿の posts.id（外部キー） |
| user_id | BIGINT | NOT NULL | — | コメント投稿者の users.id（外部キー） |
| content | TEXT | NOT NULL | — | コメントテキスト |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | コメント日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新日時 |

**制約:**

| 制約名 | 種別 | 対象カラム | 内容 |
|--------|------|-----------|------|
| comments_pkey | PRIMARY KEY | id | — |
| comments_post_id_fkey | FOREIGN KEY | post_id → posts(id) | ON DELETE CASCADE |
| comments_user_id_fkey | FOREIGN KEY | user_id → users(id) | ON DELETE CASCADE |

**インデックス:**

| インデックス名 | 対象カラム | 目的 |
|--------------|-----------|------|
| idx_comments_post_id | post_id | 投稿詳細画面のコメント一覧取得 |

---

### 3.4 post_likes テーブル

いいね情報を管理するテーブル。`id` カラムを持たず、`(post_id, user_id)` の複合主キーで一意性を保証する。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| post_id | BIGINT | NOT NULL | — | 対象投稿の posts.id（外部キー・複合主キーの一部） |
| user_id | BIGINT | NOT NULL | — | いいねしたユーザーの users.id（外部キー・複合主キーの一部） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | いいね日時 |

**制約:**

| 制約名 | 種別 | 対象カラム | 内容 |
|--------|------|-----------|------|
| post_likes_pkey | PRIMARY KEY | (post_id, user_id) | 複合主キー（1 ユーザー 1 投稿につき 1 いいね） |
| post_likes_post_id_fkey | FOREIGN KEY | post_id → posts(id) | ON DELETE CASCADE |
| post_likes_user_id_fkey | FOREIGN KEY | user_id → users(id) | ON DELETE CASCADE |

**インデックス:**

| インデックス名 | 対象カラム | 目的 |
|--------------|-----------|------|
| idx_post_likes_post_id | post_id | 投稿ごとのいいね数集計 |
| idx_post_likes_user_id | user_id | ユーザーのいいね一覧取得 |

---

### 3.5 user_follows テーブル

フォロー関係を管理するテーブル。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| follower_id | BIGINT | NOT NULL | — | フォローする側のユーザー（users.id）。複合主キーの一部 |
| following_id | BIGINT | NOT NULL | — | フォローされる側のユーザー（users.id）。複合主キーの一部 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | フォロー日時 |

**制約:**

| 制約名 | 種別 | 対象カラム | 内容 |
|--------|------|-----------|------|
| user_follows_pkey | PRIMARY KEY | (follower_id, following_id) | 複合主キー（重複フォロー不可） |
| user_follows_follower_id_fkey | FOREIGN KEY | follower_id → users(id) | ON DELETE CASCADE |
| user_follows_following_id_fkey | FOREIGN KEY | following_id → users(id) | ON DELETE CASCADE |
| user_follows_no_self_follow | CHECK | — | follower_id <> following_id（自己フォロー禁止） |

**インデックス:**

| インデックス名 | 対象カラム | 目的 |
|--------------|-----------|------|
| idx_user_follows_follower_id | follower_id | フォロー中ユーザーの一覧取得 |
| idx_user_follows_following_id | following_id | フォロワーの一覧取得 |

---

### 3.6 refresh_tokens テーブル

リフレッシュトークンを管理するテーブル。平文トークンは保存せず、SHA-256 ハッシュのみを保存する。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | BIGSERIAL | NOT NULL | 自動採番 | 主キー |
| user_id | BIGINT | NOT NULL | — | トークン所有者の users.id（外部キー） |
| token_hash | VARCHAR(64) | NOT NULL | — | SHA-256 ハッシュ化済みトークン。一意 |
| expires_at | TIMESTAMPTZ | NOT NULL | — | トークンの有効期限（発行から 7 日） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 発行日時 |

**制約:**

| 制約名 | 種別 | 対象カラム | 内容 |
|--------|------|-----------|------|
| refresh_tokens_pkey | PRIMARY KEY | id | — |
| refresh_tokens_token_hash_key | UNIQUE | token_hash | ハッシュの重複不可 |
| refresh_tokens_user_id_fkey | FOREIGN KEY | user_id → users(id) | ON DELETE CASCADE |

**インデックス:**

| インデックス名 | 対象カラム | 目的 |
|--------------|-----------|------|
| idx_refresh_tokens_token_hash | token_hash | トークン検証時の高速ルックアップ |

---

## 4. 関連ドキュメント

| ドキュメント | ファイル |
|------------|---------|
| 要件定義書 | [要件定義書.md](要件定義書.md) |
| インフラ構成書 | [インフラ構成書.md](インフラ構成書.md) |
| API 仕様書 | [API仕様書.md](API仕様書.md) |
