# SmartFinance AWS EC2 Infrastructure
# Terraform configuration for deploying SmartFinance on AWS Free Tier

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "smartfinance"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

# Use a known Ubuntu 22.04 LTS AMI ID for us-east-1
locals {
  ubuntu_ami_id = "ami-007f9744891c45503" # Amazon Linux 2 in us-east-1 (Free Tier eligible)
}

# Use existing key pair or create manually in AWS console
variable "existing_key_name" {
  description = "Name of existing EC2 key pair"
  type        = string
  default     = "smartfinance-key"
}

# Security Group
resource "aws_security_group" "smartfinance_sg" {
  name_prefix = "${var.project_name}-${var.environment}-"
  description = "Security group for SmartFinance application"

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP access
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

# EC2 Instance
resource "aws_instance" "smartfinance_server" {
  ami                    = local.ubuntu_ami_id
  instance_type          = "t3.micro"
  # key_name              = var.existing_key_name  # Commented out due to permissions
  vpc_security_group_ids = [aws_security_group.smartfinance_sg.id]

  # Enable detailed monitoring (free for t2.micro)
  monitoring = true

  # Root volume configuration (30GB free tier)
  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
    
    tags = {
      Name        = "${var.project_name}-${var.environment}-root-volume"
      Project     = var.project_name
      Environment = var.environment
    }
  }

  # User data script for automatic setup
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    project_name = var.project_name
    environment  = var.environment
  }))

  tags = {
    Name        = "${var.project_name}-${var.environment}-server"
    Project     = var.project_name
    Environment = var.environment
    Type        = "application-server"
  }
}

# Elastic IP
resource "aws_eip" "smartfinance_eip" {
  instance = aws_instance.smartfinance_server.id
  domain   = "vpc"

  tags = {
    Name        = "${var.project_name}-${var.environment}-eip"
    Project     = var.project_name
    Environment = var.environment
  }

  depends_on = [aws_instance.smartfinance_server]
}

# Outputs
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.smartfinance_server.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.smartfinance_eip.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.smartfinance_server.public_dns
}

output "ssh_connection_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.project_name}-key ubuntu@${aws_eip.smartfinance_eip.public_ip}"
}

output "application_url" {
  description = "URL to access the SmartFinance application"
  value       = "http://${aws_eip.smartfinance_eip.public_ip}"
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.smartfinance_sg.id
}