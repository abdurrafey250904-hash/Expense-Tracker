# ======================= COMPUTE: Launch Templates + Auto Scaling Groups =======================
# Latest Amazon Linux 2023 AMI, resolved at plan time from the public SSM parameter.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  tiers = {
    web = {
      subnets   = aws_subnet.public[*].id
      sg        = aws_security_group.web.id
      tg        = aws_lb_target_group.web.arn
      public_ip = true # web tier lives in the public subnets (inbound still limited to the ALB SG)
      sizing    = var.web_asg
    }
    app = {
      subnets   = aws_subnet.app[*].id
      sg        = aws_security_group.app.id
      tg        = aws_lb_target_group.app.arn
      public_ip = false # private subnet; outbound only through the NAT gateway
      sizing    = var.app_asg
    }
  }
}

resource "aws_launch_template" "tier" {
  for_each      = local.tiers
  name_prefix   = "${local.name}-${each.key}-"
  image_id      = data.aws_ssm_parameter.al2023.value
  instance_type = var.instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.instance[each.key].arn
  }

  network_interfaces {
    associate_public_ip_address = each.value.public_ip
    security_groups             = [each.value.sg]
    delete_on_termination       = true
  }

  # IMDSv2 only. Hop limit 1 means containers cannot reach the instance-role credentials.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 10
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  monitoring {
    enabled = true # 1-minute CloudWatch metrics so scaling reacts faster
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    tier            = each.key
    region          = var.aws_region
    repo_url        = aws_ecr_repository.repo[each.key].repository_url
    image_tag_param = aws_ssm_parameter.image_tag[each.key].name
    log_group       = aws_cloudwatch_log_group.tier[each.key].name
    secret_arn      = aws_secretsmanager_secret.app.arn
    api_upstream    = aws_lb.internal.dns_name
    client_url      = "http://${aws_lb.public.dns_name}"
    email_host      = var.email_host
    email_port      = var.email_port
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${local.name}-${each.key}", Tier = each.key, Project = var.project }
  }

  tag_specifications {
    resource_type = "volume"
    tags          = { Name = "${local.name}-${each.key}-root", Tier = each.key, Project = var.project }
  }
}

resource "aws_autoscaling_group" "tier" {
  for_each                  = local.tiers
  name                      = "${local.name}-${each.key}-asg"
  vpc_zone_identifier       = each.value.subnets # spread across 2 AZs
  min_size                  = each.value.sizing.min
  desired_capacity          = each.value.sizing.desired
  max_size                  = each.value.sizing.max
  target_group_arns         = [each.value.tg]
  health_check_type         = "ELB" # replace instances the load balancer marks unhealthy
  health_check_grace_period = 300
  default_instance_warmup   = 120
  enabled_metrics           = ["GroupInServiceInstances", "GroupDesiredCapacity", "GroupMinSize", "GroupMaxSize"]

  launch_template {
    id      = aws_launch_template.tier[each.key].id
    version = aws_launch_template.tier[each.key].latest_version
  }

  # Infrastructure changes (new AMI, instance type, user data) roll out without downtime.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.name}-${each.key}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Tier"
    value               = each.key
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = var.project
    propagate_at_launch = true
  }

  lifecycle {
    ignore_changes = [desired_capacity] # owned by auto scaling at runtime
  }
}

# Elasticity: add/remove instances automatically to hold average CPU near the target.
resource "aws_autoscaling_policy" "cpu" {
  for_each               = aws_autoscaling_group.tier
  name                   = "${local.name}-${each.key}-cpu-target"
  autoscaling_group_name = each.value.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target_percent
  }
}

# Web tier also scales on request volume per instance, coming from the public ALB.
resource "aws_autoscaling_policy" "web_requests" {
  name                   = "${local.name}-web-request-target"
  autoscaling_group_name = aws_autoscaling_group.tier["web"].name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.public.arn_suffix}/${aws_lb_target_group.web.arn_suffix}"
    }
    target_value = 1000
  }
}
