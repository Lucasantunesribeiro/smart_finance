resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.db[*].id
  tags       = merge(local.tags, { Name = "${local.name_prefix}-db-subnet" })
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-pg"
  family = "postgres15"

  parameter {
    name  = "log_min_duration_statement"
    value = "500"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }
}

resource "aws_db_instance" "main" {
  identifier              = "${local.name_prefix}-db"
  engine                  = "postgres"
  engine_version          = "15.10"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100
  db_name                 = var.db_name
  username                = "smartfinance"
  password                = random_password.db.result
  port                    = 5432
  multi_az                = var.db_multi_az
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.app.arn
  backup_retention_period = var.db_backup_retention_days
  backup_window           = var.db_backup_window
  maintenance_window      = var.db_maintenance_window
  skip_final_snapshot     = false
  deletion_protection     = true
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  parameter_group_name    = aws_db_parameter_group.main.name
  publicly_accessible     = false
  apply_immediately       = var.db_apply_immediately
  copy_tags_to_snapshot   = true
  tags                    = merge(local.tags, { Name = "${local.name_prefix}-db" })
}
