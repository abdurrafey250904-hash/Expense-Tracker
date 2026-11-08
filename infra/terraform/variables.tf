variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-2" # the only region this account's organization allows
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "expense-tracker"
}


# ---------------- Network ----------------
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnets: public ALB, NAT gateway, web tier"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "app_subnet_cidrs" {
  description = "Private subnets: internal ALB + application tier"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "db_subnet_cidrs" {
  description = "Isolated private subnets: database tier (no internet route at all)"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

# ---------------- Compute ----------------
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "web_asg" {
  type    = object({ min = number, desired = number, max = number })
  default = { min = 2, desired = 2, max = 4 }
}

variable "app_asg" {
  type    = object({ min = number, desired = number, max = number })
  default = { min = 2, desired = 2, max = 4 }
}

variable "cpu_target_percent" {
  description = "Target average CPU for ASG target-tracking scaling"
  type        = number
  default     = 50
}

# ---------------- Database ----------------
# Amazon DocumentDB / RDS cluster creation is denied by this account's Free-plan SCP,
# so the database tier is a hardened, self-managed MongoDB instance (allowed by the brief).
variable "db_instance_type" {
  type    = string
  default = "t3.small" # free-tier eligible, 2 GiB RAM
}

variable "db_private_ip" {
  description = "Fixed private IP of the MongoDB host inside the first DB subnet"
  type        = string
  default     = "10.0.21.10"
}

variable "db_volume_size_gb" {
  description = "Size of the separate, persistent EBS data volume"
  type        = number
  default     = 20
}

variable "db_admin_username" {
  type    = string
  default = "expenseadmin"
}

variable "backup_retention_days" {
  type    = number
  default = 14
}

# ---------------- App secrets / config ----------------
variable "email_host" {
  type    = string
  default = "smtp.gmail.com"
}

variable "email_port" {
  type    = string
  default = "587"
}

variable "email_user" {
  description = "Optional SMTP username (stored in Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "email_pass" {
  description = "Optional SMTP password / app password (stored in Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "alarm_email" {
  description = "Optional email address that receives CloudWatch alarm notifications"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  type    = number
  default = 14
}
