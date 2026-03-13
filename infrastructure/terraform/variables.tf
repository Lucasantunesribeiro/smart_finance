variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for Ubuntu 22.04 LTS"
  type        = string
  default     = "ami-0c02fb55956c7d316" # Ubuntu 22.04 LTS in us-east-1
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "Trusted CIDR allowed to reach the EC2 instance over SSH"
  type        = string
  default     = "203.0.113.10/32"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "smartfinance"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}
