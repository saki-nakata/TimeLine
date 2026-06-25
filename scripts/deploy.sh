#!/bin/bash
# TimeLine デプロイスクリプト
#
# 使い方: bash scripts/deploy.sh [frontend|backend|all]
# 引数なしの場合は all（フロントエンド＋バックエンド両方）

set -euo pipefail

# ============================================================
# Terraform の出力値から設定を取得
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

echo "Terraform の出力値を取得中..."
cd "$INFRA_DIR"

S3_BUCKET=$(terraform output -raw s3_frontend_bucket)
CF_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
ECR_URI=$(terraform output -raw ecr_repository_url)
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name)
ECS_SERVICE=$(terraform output -raw ecs_service_name)
AWS_REGION=$(terraform output -raw cloudfront_url | grep -oP '(?<=\.)[a-z]+-[a-z]+-[0-9]' || echo "ap-northeast-1")
AWS_REGION="ap-northeast-1"

cd "$ROOT_DIR"

TARGET="${1:-all}"

# ============================================================
# フロントエンドデプロイ
# ============================================================
deploy_frontend() {
  echo ""
  echo "===== フロントエンドデプロイ開始 ====="

  echo "--- ビルド中..."
  cd "$ROOT_DIR/frontend"
  pnpm run build

  echo "--- S3 にアップロード中..."
  aws s3 sync dist/ "s3://$S3_BUCKET" --delete

  echo "--- CloudFront キャッシュを削除中..."
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text

  cd "$ROOT_DIR"
  echo "===== フロントエンドデプロイ完了 ====="
}

# ============================================================
# バックエンドデプロイ
# ============================================================
deploy_backend() {
  echo ""
  echo "===== バックエンドデプロイ開始 ====="

  echo "--- ECR にログイン中..."
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_URI"

  echo "--- Docker イメージをビルド中..."
  cd "$ROOT_DIR/backend"
  docker build -t timeline-backend .

  echo "--- ECR にプッシュ中..."
  docker tag timeline-backend:latest "$ECR_URI:latest"
  docker push "$ECR_URI:latest"

  echo "--- ECS サービスを更新中..."
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --force-new-deployment \
    --region "$AWS_REGION" \
    --query 'service.serviceName' \
    --output text

  cd "$ROOT_DIR"
  echo "===== バックエンドデプロイ完了 ====="
}

# ============================================================
# 実行
# ============================================================
case "$TARGET" in
  frontend) deploy_frontend ;;
  backend)  deploy_backend ;;
  all)
    deploy_frontend
    deploy_backend
    ;;
  *)
    echo "使い方: bash scripts/deploy.sh [frontend|backend|all]"
    exit 1
    ;;
esac

echo ""
echo "デプロイ完了！"
CLOUDFRONT_URL=$(cd "$INFRA_DIR" && terraform output -raw cloudfront_url)
echo "アクセス URL: $CLOUDFRONT_URL"
