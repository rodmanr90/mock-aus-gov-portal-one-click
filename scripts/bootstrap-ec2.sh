#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'EOF'
Usage:
  sudo bash scripts/bootstrap-ec2.sh --repo-url <git-url> [options]

Required:
  --repo-url       GitHub repo URL (HTTPS or SSH)

Optional:
  --app-dir        App directory (default: /opt/mock-aus-gov-portal)
  --app-user       Linux user that runs app (default: ubuntu)
  --branch         Git branch (default: main)
  --port           App port (default: 3000)
  --server-name    Nginx server_name (default: _)
  --skip-nginx     Do not install/configure nginx
  --help           Show this help

Example:
  sudo bash scripts/bootstrap-ec2.sh \
    --repo-url https://github.com/you/mock-aus-gov-portal.git \
    --app-user ubuntu \
    --branch main
EOF
}

REPO_URL=""
APP_DIR="/opt/mock-aus-gov-portal"
APP_USER="ubuntu"
BRANCH="main"
APP_PORT="3000"
SERVER_NAME="_"
SKIP_NGINX="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --app-user) APP_USER="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --port) APP_PORT="$2"; shift 2 ;;
    --server-name) SERVER_NAME="$2"; shift 2 ;;
    --skip-nginx) SKIP_NGINX="true"; shift ;;
    --help|-h) print_usage; exit 0 ;;
    *) echo "Unknown argument: $1"; print_usage; exit 1 ;;
  esac
done

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: --repo-url is required."
  print_usage
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: Run as root (sudo)."
  exit 1
fi

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  echo "ERROR: app user '$APP_USER' does not exist."
  exit 1
fi

echo "==> Installing OS packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg git

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Node version: $(node -v)"
echo "==> NPM version: $(npm -v)"

echo "==> Preparing app directory at $APP_DIR"
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  echo "==> Existing repo found, updating"
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all
  sudo -u "$APP_USER" git -C "$APP_DIR" checkout "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  echo "==> Cloning repository"
  rm -rf "$APP_DIR"
  sudo -u "$APP_USER" git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "==> Installing node dependencies"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm install --omit=dev"

echo "==> Writing systemd service"
cat >/etc/systemd/system/gov-portal.service <<EOF
[Unit]
Description=Mock Australian Government Secure Collaboration Portal
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=$APP_PORT

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now gov-portal
systemctl restart gov-portal

if [[ "$SKIP_NGINX" == "false" ]]; then
  echo "==> Installing and configuring nginx"
  apt-get install -y nginx

  cat >/etc/nginx/sites-available/gov-portal <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/gov-portal /etc/nginx/sites-enabled/gov-portal
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl restart nginx
fi

echo "==> Bootstrap complete"
echo "Service status:"
systemctl --no-pager --full status gov-portal | sed -n '1,12p'
echo
echo "Done. Visit:"
if [[ "$SKIP_NGINX" == "false" ]]; then
  echo "  http://<EC2_PUBLIC_IP>/"
else
  echo "  http://<EC2_PUBLIC_IP>:$APP_PORT/"
fi

