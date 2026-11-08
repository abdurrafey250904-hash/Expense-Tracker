# ======================= DATABASE TIER (self-managed MongoDB on EC2) =======================
# Why self-managed: this account's Free-plan organization SCP denies rds:CreateDBCluster /
# rds:CreateDBInstance, so Amazon DocumentDB and RDS cannot be created. The brief allows
# "a properly secured self-managed database instance", which is implemented here as:
#   * a dedicated EC2 host in the isolated private DB subnet (no public IP)
#   * reachable ONLY from the app-tier security group on 27017
#   * MongoDB authentication enabled, credentials generated and kept in Secrets Manager
#   * data on a SEPARATE encrypted EBS volume that survives instance replacement
#   * daily compressed mongodump backups to an encrypted, private S3 bucket
#   * EC2 auto-recovery alarm (monitoring.tf) + CloudWatch logs

resource "random_password" "db" {
  length  = 32
  special = false # avoids characters that need URL-encoding in the connection string
}

# Root credentials used only by the DB host itself (the app reads its own secret).
resource "aws_secretsmanager_secret" "db" {
  name                    = "${local.name}/db"
  description             = "MongoDB root credentials for the self-managed database host"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    MONGO_INITDB_ROOT_USERNAME = var.db_admin_username
    MONGO_INITDB_ROOT_PASSWORD = random_password.db.result
  })
}

# ---------------- Object storage for backups (S3) ----------------
resource "aws_s3_bucket" "backups" {
  bucket_prefix = "${local.name}-db-backups-"
  force_destroy = true # coursework: allow terraform destroy to remove backups too
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    filter {
      prefix = "backups/"
    }
    expiration {
      days = var.backup_retention_days
    }
  }
}

data "aws_iam_policy_document" "backups_tls_only" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    resources = [aws_s3_bucket.backups.arn, "${aws_s3_bucket.backups.arn}/*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "backups" {
  bucket     = aws_s3_bucket.backups.id
  policy     = data.aws_iam_policy_document.backups_tls_only.json
  depends_on = [aws_s3_bucket_public_access_block.backups]
}

# ---------------- IAM role for the DB host (least privilege) ----------------
resource "aws_iam_role" "db" {
  name               = "${local.name}-db-instance-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "db_ssm_core" {
  role       = aws_iam_role.db.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "db" {
  statement {
    sid       = "ReadDbSecretOnly"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db.arn]
  }
  statement {
    sid       = "WriteBackupsOnly"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.backups.arn}/backups/*"]
  }
  statement {
    sid       = "ShipLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
    resources = ["${aws_cloudwatch_log_group.tier["db"].arn}:*"]
  }
}

resource "aws_iam_role_policy" "db" {
  name   = "${local.name}-db-runtime"
  role   = aws_iam_role.db.id
  policy = data.aws_iam_policy_document.db.json
}

resource "aws_iam_instance_profile" "db" {
  name = "${local.name}-db-profile"
  role = aws_iam_role.db.name
}

# ---------------- Persistent block storage (EBS) ----------------
resource "aws_ebs_volume" "db_data" {
  availability_zone = aws_subnet.db[0].availability_zone
  size              = var.db_volume_size_gb
  type              = "gp3"
  encrypted         = true
  tags              = { Name = "${local.name}-db-data", Tier = "db" }
}

# ---------------- The database host ----------------
resource "aws_instance" "db" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.db_instance_type
  subnet_id                   = aws_subnet.db[0].id
  private_ip                  = var.db_private_ip
  vpc_security_group_ids      = [aws_security_group.db.id]
  iam_instance_profile        = aws_iam_instance_profile.db.name
  associate_public_ip_address = false
  monitoring                  = true

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_size           = 10
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/user_data_db.sh.tftpl", {
    region        = var.aws_region
    volume_id     = replace(aws_ebs_volume.db_data.id, "-", "")
    db_secret_arn = aws_secretsmanager_secret.db.arn
    log_group     = aws_cloudwatch_log_group.tier["db"].name
    backup_bucket = aws_s3_bucket.backups.bucket
  })
  user_data_replace_on_change = true

  tags = { Name = "${local.name}-mongodb", Tier = "db" }

  lifecycle {
    ignore_changes = [ami] # don't replace the DB host just because a newer AMI is published
  }
}

resource "aws_volume_attachment" "db_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.db_data.id
  instance_id = aws_instance.db.id
}
