output "app_url" {
  description = "Public URL of the application"
  value       = "http://${aws_lb.public.dns_name}"
}

output "aws_region" {
  value = var.aws_region
}

output "github_deploy_user" {
  description = "IAM user whose access key is stored in GitHub secrets"
  value       = aws_iam_user.github_deploy.name
}

output "ecr_repositories" {
  value = { for k, r in aws_ecr_repository.repo : k => r.repository_url }
}

output "autoscaling_groups" {
  value = { for k, g in aws_autoscaling_group.tier : k => g.name }
}

output "internal_alb_dns" {
  value = aws_lb.internal.dns_name
}

output "db_private_ip" {
  value = aws_instance.db.private_ip
}

output "db_instance_id" {
  value = aws_instance.db.id
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.bucket
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "vpc_id" {
  value = aws_vpc.main.id
}
