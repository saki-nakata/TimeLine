# k6 パフォーマンステスト

## 前提条件

- k6 がインストールされていること（`C:\Program Files\k6\k6.exe`）
- Docker Desktop が起動していること
- バックエンド（Spring Boot）が起動していること（port 8080）
- PostgreSQL コンテナが起動していること（`timeline-db`）

## 実行手順

```bash
# 1. シードデータを投入
bash performance/k6/run.sh seed

# 2. テストを実行
#    完了後に自動で 集約HTMLレポート生成 → シードデータ削除 が実行される
bash performance/k6/run.sh smoke    # スモークテスト（約17秒）
bash performance/k6/run.sh load     # 通常負荷テスト（約14分）
bash performance/k6/run.sh stress   # ストレステスト（約20分）
bash performance/k6/run.sh spike    # スパイクテスト（約8分）

# 3. レポートを確認
#    results/index.html をブラウザで開く
```

> **注意**: `seed` を実行してからテストを実行すること。
> テスト完了後は自動で `results/index.html` が生成され、シードデータが削除される。

### その他のコマンド

```bash
bash performance/k6/run.sh index    # 集約レポートを手動生成（results/index.html）
bash performance/k6/run.sh cleanup  # シードデータを手動削除
```

## テスト構成

### スモークテスト（動作確認）

| 設定 | 値 |
|---|---|
| VU | 1 |
| イテレーション | 1回（全シナリオを順次実行） |
| 実行時間 | 約17秒 |
| thresholds | p(95) < 200ms、エラー率 < 1% |

### 通常負荷テスト

| 設定 | 値 |
|---|---|
| VU | 最大50VU |
| ステージ | 2分ランプアップ → 10分維持 → 2分ランプダウン |
| 実行時間 | 約14分 |
| thresholds | p(95) < 500ms、p(99) < 1000ms、エラー率 < 1% |

### ストレステスト

| 設定 | 値 |
|---|---|
| VU | 10 → 30 → 50 → 100 → 150 → 200VU（各3分） |
| 実行時間 | 約20分 |
| thresholds | p(95) < 2000ms、エラー率 < 1% |

### スパイクテスト

| 設定 | 値 |
|---|---|
| VU | 10（2分）→ 100（1分）→ 10（2分）→ 150（1分）→ 10（2分） |
| 実行時間 | 約8分 |
| thresholds | p(99) < 2000ms、エラー率 < 5% |

## シナリオ構成

### スモークテスト対象シナリオ（スクール方針の7シナリオ）

| シナリオ | 確認内容 |
|---|---|
| 認証 | login → getMe → logout |
| タイムライン取得 | 1ページ目取得 → ページネーション（2ページ目） |
| 投稿作成 | 投稿作成・削除 |
| いいねトグル | いいね追加・解除 |
| コメント取得・作成 | コメント取得・作成・削除 |
| プロフィール取得 | プロフィール取得 |
| 投稿一覧取得 | 1ページ目取得 → ページネーション（2ページ目） |

### 負荷/ストレス/スパイク テストのシナリオ加重分散

| シナリオ | 割合 |
|---|---|
| タイムライン取得 | 60% |
| 投稿作成 | 15% |
| いいね | 7.5% |
| コメント | 7.5% |
| プロフィール | 10% |

## シードデータ

| データ | 件数 |
|---|---|
| テストユーザー | 100名（perf_user_001〜perf_user_100） |
| 投稿 | 10,000件 |
| いいね | 20,000件 |
| コメント | 5,000件 |

- パスワード: `perfPassword1!`
- `seed` コマンドは何度でも再実行可能（既存データを削除してから再投入）

## HTMLレポート

テスト実行後に `results/` に以下が自動生成される：

- 個別レポート: `results/combined-{type}-{timestamp}.html`
- 集約レポート: `results/index.html`

集約レポートは Smoke / Load / Stress / Spike のタブ切り替えで全テスト結果を1枚で確認できる。

## フォーマット

```bash
cd performance/k6
pnpm install       # 初回のみ
pnpm format        # フォーマット実行
pnpm format:check  # チェックのみ
```

## ディレクトリ構成

```
performance/k6/
├── config/          # ベースURL・テストユーザー設定
├── data/            # CSVフィーダー（users.csv、search_keywords.csv）
├── helpers/         # 認証ヘルパー・HTMLレポート生成
├── requests/        # エンドポイントごとのリクエスト関数
├── scenarios/       # シナリオ（ユーザー操作フロー）
├── simulations/
│   ├── smoke/       # smokeTest.ts
│   ├── load/        # loadTest.ts
│   ├── stress/      # stressTest.ts
│   └── spike/       # spikeTest.ts
├── results/         # テスト結果HTML/JSON（.gitignore対象）
└── run.sh           # テスト実行スクリプト
```
