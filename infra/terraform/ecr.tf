# ======================= CONTAINER REGISTRY (Amazon ECR) =======================
resource "aws_ecr_repository" "repo" {
  for_each             = toset(["web", "app"])
  name                 = "${local.name}-${each.key}"
  image_tag_mutability = "IMMUTABLE" # a tag (git SHA) always points to the same image
  force_delete         = true        # lets `terraform destroy` clean up after the demo

  image_scanning_configuration {
    scan_on_push = true # basic vulnerability scan on every push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Keep only the 10 most recent images to control storage cost.
resource "aws_ecr_lifecycle_policy" "repo" {
  for_each   = aws_ecr_repository.repo
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# Release pointer: the image tag each tier should run. CI/CD updates it and instances
# read it at boot, so instances launched by auto scaling always run the latest release.
resource "aws_ssm_parameter" "image_tag" {
  for_each    = toset(["web", "app"])
  name        = "/${local.name}/${each.key}/image_tag"
  description = "Current ${each.key} image tag (set by GitHub Actions)"
  type        = "String"
  value       = "none"

  lifecycle {
    ignore_changes = [value] # owned by the pipeline after creation
  }
}
