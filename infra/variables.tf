variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "プロジェクト名（リソース名のプレフィックスに使用）"
  type        = string
  default     = "timeline"
}

variable "db_password" {
  description = "RDS PostgreSQL のパスワード"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Spring Boot JWT シークレットキー"
  type        = string
  sensitive   = true
}

variable "s3_image_bucket_name" {
  description = "画像ストレージ用 S3 バケット名（既存）"
  type        = string
  default     = "saki-timeline-images"
}

variable "s3_frontend_bucket_name" {
  description = "フロントエンド配信用 S3 バケット名（グローバルに一意である必要がある）"
  type        = string
  default     = "saki-timeline-frontend"
}
