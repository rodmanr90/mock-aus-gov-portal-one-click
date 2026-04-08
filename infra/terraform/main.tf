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
# We have removed the variable definitions from here because they 
# already exist in your variables.tf file. This stops the "Duplicate" errors.

# --- NETWORK ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc" }
}

# --- WIZ INTEGRATION (Manual Resource Version) ---

# 1. Create the IAM Role for Wiz
resource "aws_iam_role" "wiz_role" {
  name = "WizAccessRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        # The Principal MUST be an object with the key 'AWS'
        Principal = {
          AWS = "arn:aws:iam::830522659852:role/prod-us36-AssumeRoleDelegator"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.wiz_external_id
          }
        }
      }
    ]
  })
}

# 2. Attach the SecurityAudit policy (Standard for Wiz)
resource "aws_iam_role_policy_attachment" "wiz_read_only" {
  role       = aws_iam_role.wiz_role.name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}

# 3. Attach a custom policy for deeper scanning if needed
resource "aws_iam_role_policy" "wiz_custom_scan" {
  name = "WizCustomScanPolicy"
  role = aws_iam_role.wiz_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ec2:Describe*",
          "s3:GetBucketLocation",
          "s3:ListAllMyBuckets"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
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
              # Nginx landing page (AWS Version)
              apt-get update
              apt-get install -y nginx
              cat << 'HTML' > /var/www/html/index.html
              <!DOCTYPE html>
              <html>
              <head><title>Australian Government Portal</title></head>
              <body style="background-color: #002b45; color: white; text-align: center; padding: 50px;">
                <h1>Department of Infrastructure & Digital Security</h1>
                <h2>Secure AWS Landing Zone Active</h2>
                <p>Monitored by Wiz.io</p>
              </body>
              </html>
              HTML
              systemctl start nginx
              systemctl enable nginx
              EOF

  tags = { Name = "${var.project_name}-instance" }
}
