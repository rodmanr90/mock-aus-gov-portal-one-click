output "ec2_public_ip" {
  description = "The public IP address of the app server"
  value       = aws_instance.app_server.public_ip
}

output "ec2_public_dns" {
  description = "The public DNS of the app server"
  value       = aws_instance.app_server.public_dns
}

output "ec2_username" {
  description = "The default system user for the AMI"
  value       = "ubuntu"
}
