# SmartFinance AWS Infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "smartfinance_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "smartfinance-vpc"
    Environment = var.environment
    Project     = "SmartFinance"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "smartfinance_igw" {
  vpc_id = aws_vpc.smartfinance_vpc.id

  tags = {
    Name        = "smartfinance-igw"
    Environment = var.environment
  }
}

# Public Subnet
resource "aws_subnet" "smartfinance_public_subnet" {
  vpc_id                  = aws_vpc.smartfinance_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "smartfinance-public-subnet"
    Environment = var.environment
  }
}

# Route Table
resource "aws_route_table" "smartfinance_public_rt" {
  vpc_id = aws_vpc.smartfinance_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.smartfinance_igw.id
  }

  tags = {
    Name        = "smartfinance-public-rt"
    Environment = var.environment
  }
}

# Route Table Association
resource "aws_route_table_association" "smartfinance_public_rta" {
  subnet_id      = aws_subnet.smartfinance_public_subnet.id
  route_table_id = aws_route_table.smartfinance_public_rt.id
}# S
ecurity Group
resource "aws_security_group" "smartfinance_sg" {
  name_prefix = "smartfinance-sg"
  vpc_id      = aws_vpc.smartfinance_vpc.id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Payment Service
  ingress {
    from_port   = 3001
    to_port     = 3001
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
    Name        = "smartfinance-security-group"
    Environment = var.environment
  }
}

# Key Pair
resource "aws_key_pair" "smartfinance_key" {
  key_name   = "smartfinance-key"
  public_key = var.public_key

  tags = {
    Name        = "smartfinance-key"
    Environment = var.environment
  }
}

# EC2 Instance
resource "aws_instance" "smartfinance_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.smartfinance_key.key_name
  vpc_security_group_ids = [aws_security_group.smartfinance_sg.id]
  subnet_id              = aws_subnet.smartfinance_public_subnet.id

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  }))

  tags = {
    Name        = "smartfinance-server"
    Environment = var.environment
    Project     = "SmartFinance"
  }
}

# Elastic IP
resource "aws_eip" "smartfinance_eip" {
  instance = aws_instance.smartfinance_server.id
  domain   = "vpc"

  tags = {
    Name        = "smartfinance-eip"
    Environment = var.environment
  }
}