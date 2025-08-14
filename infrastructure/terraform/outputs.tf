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

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.smartfinance_vpc.id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.smartfinance_sg.id
}

output "application_url" {
  description = "URL to access the SmartFinance application"
  value       = "http://${aws_eip.smartfinance_eip.public_ip}"
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${aws_eip.smartfinance_eip.public_ip}:5000"
}

output "payment_service_url" {
  description = "URL to access the Payment Service"
  value       = "http://${aws_eip.smartfinance_eip.public_ip}:3001"
}