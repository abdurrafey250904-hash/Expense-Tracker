# ======================= SECRETS MANAGEMENT (AWS Secrets Manager) =======================
# No credential is hard-coded in the code, the image or the pipeline. App instances fetch
# this secret at container start with their IAM role, which can read ONLY this secret.
resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  description             = "Runtime secrets for the Express API (DB URI, JWT secret, SMTP)"
  recovery_window_in_days = 0 # immediate delete on destroy (coursework)
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    MONGO_URI = format(
      "mongodb://%s:%s@%s:27017/expense_tracker?authSource=admin",
      var.db_admin_username,
      random_password.db.result,
      var.db_private_ip,
    )
    JWT_SECRET = random_password.jwt.result
    EMAIL_USER = var.email_user
    EMAIL_PASS = var.email_pass
  })
}
