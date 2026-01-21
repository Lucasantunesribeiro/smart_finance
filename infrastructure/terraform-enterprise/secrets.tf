resource "aws_kms_key" "app" {
  description             = "${local.name_prefix} encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "app" {
  name          = "alias/${local.name_prefix}-key"
  target_key_id = aws_kms_key.app.key_id
}

resource "random_password" "db" {
  length  = 24
  special = true
}

resource "random_password" "jwt_access" {
  length  = 48
  special = true
}

resource "random_password" "jwt_refresh" {
  length  = 48
  special = true
}

resource "random_password" "jwt_signing" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${local.name_prefix}/db"
  recovery_window_in_days = 7
  kms_key_id              = aws_kms_key.app.arn
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "smartfinance"
    password = random_password.db.result
    dbname   = var.db_name
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    url      = "postgres://smartfinance:${urlencode(random_password.db.result)}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}"
  })
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}/app"
  recovery_window_in_days = 7
  kms_key_id              = aws_kms_key.app.arn
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    JWT_ACCESS_SECRET = random_password.jwt_access.result
    JWT_REFRESH_SECRET = random_password.jwt_refresh.result
    JWT_SECRET_KEY = random_password.jwt_signing.result
    JWT_ISSUER = "SmartFinance"
    JWT_AUDIENCE = "SmartFinanceUsers"
  })
}
