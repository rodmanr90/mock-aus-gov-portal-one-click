resource "random_id" "suffix" {
  byte_length = 4
}

# --- DATA SOURCES ---
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# --- VARIABLES ---
variable "aws_region" {}
variable "instance_type" {}
variable "project_name" {}
variable "ec2_public_key" {}
variable "ssh_ingress_cidr" {}
variable "http_ingress_cidr" {}

# 1. ADD THIS VARIABLE FOR WIZ
variable "wiz_external_id" {
  type      = string
  sensitive = true
}

# --- NETWORK ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc" }
}

# 2. ADD THE WIZ MODULE HERE
module "wiz-configuration" {
  source          = "wiz-sec/wiz-iam-role/aws"
  version         = "~> 1.0"
  wiz_external_id = var.wiz_external_id
  wiz_arn         = "arn:aws:iam::197116010530:root" 
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public_rt.id
}

# --- SECURITY & KEYS ---
resource "aws_key_pair" "deployer" {
  key_name   = "${var.project_name}-key-${random_id.suffix.hex}"
  public_key = var.ec2_public_key
}

resource "aws_security_group" "app_sg" {
  name   = "${var.project_name}-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_ingress_cidr]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.http_ingress_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- COMPUTE ---
resource "aws_instance" "app_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.deployer.key_name
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app_sg.id]
  user_data_replace_on_change = true 

  user_data = <<-EOF
              #!/bin/bash
              # ... your existing shell script ...
              EOF

  tags = { Name = "${var.project_name}-instance" }
}
