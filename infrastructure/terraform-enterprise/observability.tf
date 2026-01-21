resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name_prefix}-frontend"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name_prefix}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "backend_cpu" {
  alarm_name          = "${local.name_prefix}-backend-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

resource "aws_cloudwatch_metric_alarm" "frontend_cpu" {
  alarm_name          = "${local.name_prefix}-frontend-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.frontend.name
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${local.name_prefix}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.name_prefix}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
#   alarm_name          = "${local.name_prefix}-alb-5xx"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = 2
#   metric_name         = "HTTPCode_Target_5XX_Count"
#   namespace           = "AWS/ApplicationELB"
#   period              = 60
#   statistic           = "Sum"
#   threshold           = 5
#   dimensions = {
#     LoadBalancer = aws_lb.app.arn_suffix
#   }
# }

# resource "aws_cloudwatch_metric_alarm" "backend_cpu" {
#   alarm_name          = "${local.name_prefix}-backend-cpu"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = 2
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/ECS"
#   period              = 60
#   statistic           = "Average"
#   threshold           = 80
#   dimensions = {
#     ClusterName = aws_ecs_cluster.main.name
#     ServiceName = aws_ecs_service.backend.name
#   }
# }

# resource "aws_cloudwatch_metric_alarm" "frontend_cpu" {
#   alarm_name          = "${local.name_prefix}-frontend-cpu"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = 2
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/ECS"
#   period              = 60
#   statistic           = "Average"
#   threshold           = 80
#   dimensions = {
#     ClusterName = aws_ecs_cluster.main.name
#     ServiceName = aws_ecs_service.frontend.name
#   }
# }

# resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
#   alarm_name          = "${local.name_prefix}-rds-cpu"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = 2
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/RDS"
#   period              = 60
#   statistic           = "Average"
#   threshold           = 80
#   dimensions = {
#     DBInstanceIdentifier = aws_db_instance.main.id
#   }
# }

# resource "aws_cloudwatch_metric_alarm" "rds_connections" {
#   alarm_name          = "${local.name_prefix}-rds-connections"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = 2
#   metric_name         = "DatabaseConnections"
#   namespace           = "AWS/RDS"
#   period              = 60
#   statistic           = "Average"
#   threshold           = 80
#   dimensions = {
#     DBInstanceIdentifier = aws_db_instance.main.id
#   }
# }

# resource "aws_cloudwatch_dashboard" "main" {
#   dashboard_name = "${local.name_prefix}-dashboard"
#   dashboard_body = jsonencode({
#     widgets = [
#       {
#         type   = "metric"
#         width  = 12
#         height = 6
#         properties = {
#           metrics = [
#             ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.backend.name],
#             ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.frontend.name]
#           ]
#           period = 60
#           stat   = "Average"
#           title  = "ECS CPU"
#         }
#       },
#       {
#         type   = "metric"
#         width  = 12
#         height = 6
#         properties = {
#           metrics = [
#             ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.app.arn_suffix]
#           ]
#           period = 60
#           stat   = "Sum"
#           title  = "ALB 5XX"
#         }
#       },
#       {
#         type   = "metric"
#         width  = 12
#         height = 6
#         properties = {
#           metrics = [
#             ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id]
#           ]
#           period = 60
#           stat   = "Average"
#           title  = "RDS CPU"
#         }
#       }
#     ]
#   })
# }
