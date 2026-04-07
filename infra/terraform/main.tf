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

# --- NETWORK ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc" }
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
  # This makes the name something like mock-gov-portal-key-a1b2c3d4
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

# Allow the Node.js app on Port 3000
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
  
  # This ensures GitHub Actions recreates the server when you change the HTML/CSS
  user_data_replace_on_change = true 

  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y nginx

              cat << 'HTML' > /var/www/html/index.html
              <!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <title>Australian Government Portal</title>
                  <style>
                      body {
                          font-family: 'Open Sans', Arial, sans-serif;
                          margin: 0;
                          background-color: #f4f4f4;
                          color: #333;
                      }
                      header {
                          background-color: #002b45; /* Gov Blue */
                          color: white;
                          padding: 20px 40px;
                          border-bottom: 6px solid #fecb2f; /* Gov Gold */
                          display: flex;
                          align-items: center;
                      }
                      .emblem {
                          background-image: url("data:image/png;base64,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");
                          background-size: contain;
                          background-repeat: no-repeat;
                          width: 250px;
                          height: 120px;
                          margin-right: 25px;
                      }
                      .container {
                          padding: 60px 20px;
                          text-align: center;
                      }
                      .card {
                          background: white;
                          padding: 45px;
                          border-radius: 4px;
                          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                          display: inline-block;
                          max-width: 650px;
                          border-top: 5px solid #002b45;
                      }
                      h1 { margin: 0; font-size: 26px; font-weight: 600; }
                      h2 { color: #002b45; margin-top: 0; }
                      p { color: #444; line-height: 1.7; font-size: 18px; }
                      .status-box {
                          margin-top: 25px;
                          padding: 10px;
                          background-color: #e7f3ff;
                          border: 1px solid #b3d7ff;
                          font-size: 14px;
                          font-weight: bold;
                      }
                  </style>
              </head>
              <body>
                  <header>
                      <div class="emblem"></div>
                      <h1>Department of Infrastructure & Digital Security</h1>
                  </header>
                  <div class="container">
                      <div class="card">
                          <h2>Secure Landing Zone Active</h2>
                          <p>Welcome to your first GCP workload. This environment has been automatically hardened and provisioned via a Wiz-monitored CI/CD pipeline.</p>
                          <div class="status-box">
                              SYSTEM STATUS: OPERATIONAL | COMPLIANCE: CIS BENCHMARK v2.0
                          </div>
                      </div>
                  </div>
              </body>
              </html>
              HTML

              systemctl start nginx
              systemctl enable nginx
              EOF

  tags = { Name = "$${var.project_name}-instance" }
}
