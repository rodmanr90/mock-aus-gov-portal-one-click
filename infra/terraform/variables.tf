variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "mock-gov-portal"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ec2_username" {
  description = "Default SSH username for AMI"
  type        = string
  default     = "ubuntu"
}

variable "ec2_public_key" {
  description = "Public key material for EC2 key pair"
  type        = string
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to SSH into EC2"
  type        = string
  default     = "0.0.0.0/0"
}

variable "http_ingress_cidr" {
  description = "CIDR allowed for HTTP traffic"
  type        = string
  default     = "0.0.0.0/0"
}

# Added for Wiz Integration
variable "wiz_external_id" {
  description = "External ID provided by Wiz for the AWS Connector"
  type        = string
  sensitive   = true
}
