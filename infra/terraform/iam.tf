# ======================= IAM (least privilege) =======================

# ---------------------------------------------------------------------------
# EC2 instance roles: one per tier, each scoped to its own repo/parameter/logs.
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  for_each           = toset(["web", "app"])
  name               = "${local.name}-${each.key}-instance-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Systems Manager: replaces SSH (Session Manager) and receives CI/CD deploy commands.
resource "aws_iam_role_policy_attachment" "ssm_core" {
  for_each   = aws_iam_role.instance
  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "instance" {
  for_each = toset(["web", "app"])

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid       = "PullOwnImageOnly"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [aws_ecr_repository.repo[each.key].arn]
  }

  statement {
    sid       = "ReadReleaseTag"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.image_tag[each.key].arn]
  }

  statement {
    sid       = "ShipContainerLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
    resources = ["${aws_cloudwatch_log_group.tier[each.key].arn}:*"]
  }

  dynamic "statement" {
    for_each = each.key == "app" ? [1] : []
    content {
      sid       = "ReadAppSecretOnly"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [aws_secretsmanager_secret.app.arn]
    }
  }
}

resource "aws_iam_role_policy" "instance" {
  for_each = aws_iam_role.instance
  name     = "${local.name}-${each.key}-runtime"
  role     = each.value.id
  policy   = data.aws_iam_policy_document.instance[each.key].json
}

resource "aws_iam_instance_profile" "instance" {
  for_each = aws_iam_role.instance
  name     = "${local.name}-${each.key}-profile"
  role     = each.value.name
}

# ---------------------------------------------------------------------------
# CI/CD identity for GitHub Actions.
# The preferred design is OIDC federation (no stored keys), but this AWS account's
# organization SCP explicitly denies iam:CreateOpenIDConnectProvider. So a dedicated
# IAM user with a narrowly scoped policy is used instead. Its access key is created
# outside Terraform and piped straight into GitHub encrypted secrets (see DEPLOYMENT.md).
# ---------------------------------------------------------------------------
resource "aws_iam_user" "github_deploy" {
  name = "${local.name}-github-deploy"
  path = "/ci/"
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "PushToProjectRepos"
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [for r in aws_ecr_repository.repo : r.arn]
  }

  statement {
    sid       = "PublishReleaseTag"
    actions   = ["ssm:GetParameter", "ssm:PutParameter"]
    resources = [for p in aws_ssm_parameter.image_tag : p.arn]
  }

  statement {
    sid       = "RunDeployScriptDocument"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript"]
  }

  statement {
    sid       = "RunDeployScriptOnProjectInstancesOnly"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/*"]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Project"
      values   = [var.project]
    }
  }

  statement {
    sid = "ReadDeploymentState"
    actions = [
      "ssm:GetCommandInvocation", "ssm:ListCommandInvocations", "ssm:ListCommands", "ssm:DescribeInstanceInformation",
      "autoscaling:DescribeAutoScalingGroups", "ec2:DescribeInstances",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_user_policy" "github_deploy" {
  name   = "${local.name}-github-deploy"
  user   = aws_iam_user.github_deploy.name
  policy = data.aws_iam_policy_document.github_deploy.json
}
