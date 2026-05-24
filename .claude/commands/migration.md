DB マイグレーションファイルを追加する際は、以下の手順を必ず守ること。

## 事前確認

マイグレーションファイルを作成する**前**に、バックエンドが起動中かどうかを確認する。

```bash
# ポート 8080 が使用中か確認
netstat -ano | findstr ":8080"
```

- **起動中の場合**: マイグレーションファイル作成後に**バックエンドの再起動が必要**。ファイルを作成した段階でユーザーに再起動を依頼する（または許可があれば自分で再起動する）。
- **停止中の場合**: マイグレーションファイルを作成し、次回起動時に Flyway が自動適用するため追加作業不要。

## 理由

Flyway はバックエンド（Spring Boot）の**起動時にのみ**マイグレーションを実行する。
バックエンドが起動したままの状態で新しいマイグレーションファイルを追加しても、そのセッション中は適用されない。
再起動することで Flyway が新ファイルを検出し、テーブル作成・変更が実行される。

## マイグレーションファイルの命名規則

```
backend/src/main/resources/db/migration/V{次の番号}__{説明}.sql
```

例: 既存が V6 まであれば `V7__create_user_follows_table.sql`

## 再起動手順（バックエンドが起動中の場合）

```bash
# 1. バックエンドの PID を特定
netstat -ano | findstr ":8080"

# 2. プロセスを停止
powershell -Command "Stop-Process -Id {PID} -Force"

# 3. 再起動
cd backend && ./gradlew bootRun
```

## 適用確認

再起動後、Flyway のマイグレーション履歴テーブルで適用済みか確認する。

```bash
docker exec timeline-db psql -U postgres -d timeline \
  -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
```

`success = t` で新バージョンが表示されていれば適用完了。
