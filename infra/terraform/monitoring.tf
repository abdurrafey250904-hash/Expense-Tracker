# ======================= CENTRALIZED LOGGING & MONITORING (CloudWatch) =======================
resource "aws_cloudwatch_log_group" "tier" {
  for_each          = toset(["web", "app", "db"])
  name              = "/${local.name}/${each.key}"
  retention_in_days = var.log_retention_days
}

resource "aws_sns_topic" "alarms" {
  name = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name}-public-alb-5xx"
  alarm_description   = "Public ALB is returning 5xx errors"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  dimensions          = { LoadBalancer = aws_lb.public.arn_suffix }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  for_each = {
    web = { lb = aws_lb.public.arn_suffix, tg = aws_lb_target_group.web.arn_suffix }
    app = { lb = aws_lb.internal.arn_suffix, tg = aws_lb_target_group.app.arn_suffix }
  }
  alarm_name          = "${local.name}-${each.key}-unhealthy-hosts"
  alarm_description   = "${each.key} target group has unhealthy targets"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  dimensions          = { LoadBalancer = each.value.lb, TargetGroup = each.value.tg }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${local.name}-db-cpu-high"
  alarm_description   = "MongoDB host CPU above 80%"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = aws_instance.db.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

# Self-healing for the single DB host: on a failed system status check EC2 automatically
# recovers the instance onto healthy hardware, keeping its private IP and EBS volumes.
resource "aws_cloudwatch_metric_alarm" "db_auto_recover" {
  alarm_name          = "${local.name}-db-auto-recover"
  alarm_description   = "Recover the MongoDB host if the underlying hardware fails"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_System"
  dimensions          = { InstanceId = aws_instance.db.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = ["arn:aws:automate:${var.aws_region}:ec2:recover", aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.name
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 12, height = 6
        properties = {
          title = "Public ALB - requests & 5xx", region = var.aws_region, stat = "Sum", period = 60
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.public.arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 0, width = 12, height = 6
        properties = {
          title = "Response time (p90, seconds)", region = var.aws_region, stat = "p90", period = 60
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.public.arn_suffix, { label = "public ALB" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.internal.arn_suffix, { label = "internal ALB" }],
          ]
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          title = "ASG average CPU %", region = var.aws_region, stat = "Average", period = 60
          metrics = [
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", aws_autoscaling_group.tier["web"].name, { label = "web" }],
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", aws_autoscaling_group.tier["app"].name, { label = "app" }],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6
        properties = {
          title = "In-service instances", region = var.aws_region, stat = "Average", period = 60
          metrics = [
            ["AWS/AutoScaling", "GroupInServiceInstances", "AutoScalingGroupName", aws_autoscaling_group.tier["web"].name, { label = "web" }],
            ["AWS/AutoScaling", "GroupInServiceInstances", "AutoScalingGroupName", aws_autoscaling_group.tier["app"].name, { label = "app" }],
          ]
        }
      },
      {
        type = "metric", x = 0, y = 12, width = 24, height = 6
        properties = {
          title = "MongoDB host - CPU %", region = var.aws_region, stat = "Average", period = 60
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.db.id],
          ]
        }
      },
    ]
  })
}
