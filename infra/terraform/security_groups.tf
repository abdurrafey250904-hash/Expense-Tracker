# ======================= SECURITY GROUPS (one per tier) =======================
# Chain of trust:  Internet -> public ALB -> web -> internal ALB -> app -> MongoDB (DB subnet)
# Each SG only accepts traffic from the SG directly in front of it (least privilege).
# No SSH anywhere: instances are managed through AWS Systems Manager.

# ---- Public ALB ----
resource "aws_security_group" "public_alb" {
  name        = "${local.name}-public-alb-sg"
  description = "Public ALB - HTTP from the internet"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-public-alb-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "public_alb_http" {
  security_group_id = aws_security_group.public_alb.id
  description       = "HTTP from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "public_alb_to_web" {
  security_group_id            = aws_security_group.public_alb.id
  description                  = "Forward to web tier only"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

# ---- Web tier ----
resource "aws_security_group" "web" {
  name        = "${local.name}-web-sg"
  description = "Web tier (Nginx) - only from public ALB"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-web-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "web_from_alb" {
  security_group_id            = aws_security_group.web.id
  description                  = "HTTP from public ALB only"
  referenced_security_group_id = aws_security_group.public_alb.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "web_https_out" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS out - ECR pulls, SSM agent, CloudWatch Logs"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "web_to_internal_alb" {
  security_group_id            = aws_security_group.web.id
  description                  = "Proxy /api to internal ALB only"
  referenced_security_group_id = aws_security_group.internal_alb.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "web_dns" {
  security_group_id = aws_security_group.web.id
  description       = "DNS to VPC resolver"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "udp"
  from_port         = 53
  to_port           = 53
}

# ---- Internal ALB ----
resource "aws_security_group" "internal_alb" {
  name        = "${local.name}-internal-alb-sg"
  description = "Internal ALB - only from web tier"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-internal-alb-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "internal_alb_from_web" {
  security_group_id            = aws_security_group.internal_alb.id
  description                  = "HTTP from web tier only"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "internal_alb_to_app" {
  security_group_id            = aws_security_group.internal_alb.id
  description                  = "Forward to app tier only"
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 5000
  to_port                      = 5000
}

# ---- Application tier ----
resource "aws_security_group" "app" {
  name        = "${local.name}-app-sg"
  description = "App tier (Express API) - only from internal ALB"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-app-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "app_from_internal_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "API port from internal ALB only"
  referenced_security_group_id = aws_security_group.internal_alb.id
  ip_protocol                  = "tcp"
  from_port                    = 5000
  to_port                      = 5000
}

resource "aws_vpc_security_group_egress_rule" "app_to_db" {
  security_group_id            = aws_security_group.app.id
  description                  = "MongoDB protocol to the database host only"
  referenced_security_group_id = aws_security_group.db.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_egress_rule" "app_https_out" {
  security_group_id = aws_security_group.app.id
  description       = "HTTPS out via NAT - ECR, SSM, Secrets Manager, CloudWatch"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "app_smtp_out" {
  security_group_id = aws_security_group.app.id
  description       = "SMTP submission for report emails"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 587
  to_port           = 587
}

resource "aws_vpc_security_group_egress_rule" "app_dns" {
  security_group_id = aws_security_group.app.id
  description       = "DNS to VPC resolver"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "udp"
  from_port         = 53
  to_port           = 53
}

# ---- Database tier ----
resource "aws_security_group" "db" {
  name        = "${local.name}-db-sg"
  description = "MongoDB database host - only from app tier"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-db-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  description                  = "MongoDB protocol from app tier only"
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_egress_rule" "db_https_out" {
  security_group_id = aws_security_group.db.id
  description       = "HTTPS out via NAT - OS packages, MongoDB image, SSM, CloudWatch, S3 backups"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "db_dns" {
  security_group_id = aws_security_group.db.id
  description       = "DNS to VPC resolver"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "udp"
  from_port         = 53
  to_port           = 53
}
