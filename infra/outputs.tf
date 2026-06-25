output "cloudfront_url" {
  description = "CloudFront の URL（フロントエンドアクセス先）"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "alb_dns" {
  description = "ALB の DNS 名（バックエンド直接アクセス用）"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "ECR リポジトリ URL（docker push 先）"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDS エンドポイント"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "s3_frontend_bucket" {
  description = "フロントエンド配信用 S3 バケット名"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront ディストリビューション ID（キャッシュ削除用）"
  value       = aws_cloudfront_distribution.main.id
}

output "ecs_cluster_name" {
  description = "ECS クラスター名"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS サービス名"
  value       = aws_ecs_service.backend.name
}
