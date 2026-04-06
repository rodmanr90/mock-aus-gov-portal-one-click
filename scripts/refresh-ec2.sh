#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mock-aus-gov-portal}"
APP_USER="${APP_USER:-ubuntu}"
BRANCH="${BRANCH:-main}"

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo."
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "App directory does not look like a git repo: $APP_DIR"
  exit 1
fi

echo "==> Updating repository"
sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all
sudo -u "$APP_USER" git -C "$APP_DIR" checkout "$BRANCH"
sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin "$BRANCH"

echo "==> Installing dependencies"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm install --omit=dev"

echo "==> Restarting service"
systemctl restart gov-portal
systemctl --no-pager --full status gov-portal | sed -n '1,12p'

echo "Done."

