#!/usr/bin/env bash
# Kuteera Kitchen — one-time VPS initial setup
# Run as root on a fresh Ubuntu 24.04 VPS.
# Usage: bash vps-initial-setup.sh
#
# What this does:
#   1. Updates the system
#   2. Installs Node.js 20, Python 3.12, MySQL, Nginx, Certbot
#   3. Creates a 'deploy' user with SSH access
#   4. Creates deployment directories for DEV and PROD
#   5. Clones the repo into both directories
#   6. Creates Python venvs and installs backend requirements
#   7. Copies systemd service files and enables them
#   8. Configures sudoers for the deploy user
#   9. Sets up the backup directory
#
# Before running:
#   - Have your GitLab SSH deploy key ready (for cloning)
#   - Have your domain names pointed to this VPS IP
#   - Replace GITLAB_REPO_URL below with your repo's SSH URL
#   - Replace DEPLOY_SSH_PUBLIC_KEY with the deploy user's public key

set -euo pipefail

GITLAB_REPO_URL="git@gitlab.com:YOUR_NAMESPACE/kk_v1.git"
DEPLOY_SSH_PUBLIC_KEY="ssh-ed25519 AAAA... deploy@kk"  # replace with real key

DEV_DIR="/var/www/kk_v1_dev"
PROD_DIR="/var/www/kk_v1_prod"
BACKUP_DIR="/opt/kk-backups"

echo "=== [1/9] System update ==="
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git unzip build-essential

echo "=== [2/9] Install Node.js 20 (NodeSource) ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version && npm --version

echo "=== [3/9] Install Python 3.12 ==="
apt-get install -y python3.12 python3.12-venv python3-pip

echo "=== [4/9] Install MySQL Server ==="
apt-get install -y mysql-server
systemctl enable --now mysql
echo "MySQL installed. Secure it manually: sudo mysql_secure_installation"
echo "Then create databases and user — see below."

echo "=== [5/9] Install Nginx and Certbot ==="
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx

echo "=== [6/9] Create deploy user ==="
if ! id deploy &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
fi
mkdir -p /home/deploy/.ssh
echo "$DEPLOY_SSH_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

echo "=== [7/9] Create deployment directories and clone repo ==="
mkdir -p "$DEV_DIR" "$PROD_DIR"
chown -R deploy:deploy /var/www/kk_v1_dev /var/www/kk_v1_prod

# Clone as deploy user
sudo -u deploy git clone "$GITLAB_REPO_URL" "$DEV_DIR" || echo "DEV dir already cloned — skipping"
sudo -u deploy git -C "$DEV_DIR" checkout develop

sudo -u deploy git clone "$GITLAB_REPO_URL" "$PROD_DIR" || echo "PROD dir already cloned — skipping"
sudo -u deploy git -C "$PROD_DIR" checkout main

echo "=== [8/9] Create Python venvs and install requirements ==="
sudo -u deploy python3.12 -m venv "$DEV_DIR/backend/venv"
sudo -u deploy "$DEV_DIR/backend/venv/bin/pip" install -q -r "$DEV_DIR/backend/requirements.txt"

sudo -u deploy python3.12 -m venv "$PROD_DIR/backend/venv"
sudo -u deploy "$PROD_DIR/backend/venv/bin/pip" install -q -r "$PROD_DIR/backend/requirements.txt"

echo "=== [9/9] Install systemd services, sudoers, logrotate, and backup dir ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy service files
cp "$SCRIPT_DIR/kk-backend-dev.service"  /etc/systemd/system/
cp "$SCRIPT_DIR/kk-backend-prod.service" /etc/systemd/system/
cp "$SCRIPT_DIR/kk-frontend-dev.service" /etc/systemd/system/
cp "$SCRIPT_DIR/kk-frontend-prod.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable kk-backend-dev kk-backend-prod kk-frontend-dev kk-frontend-prod

# Sudoers for deploy user
cp "$SCRIPT_DIR/deploy-sudoers" /etc/sudoers.d/kk-deploy
chmod 0440 /etc/sudoers.d/kk-deploy

# Logrotate
cp "$SCRIPT_DIR/logrotate-kk" /etc/logrotate.d/kk

# Backup directory
mkdir -p "$BACKUP_DIR/prod" "$BACKUP_DIR/dev"
cp "$SCRIPT_DIR/backup-prod.sh" "$BACKUP_DIR/"
chmod +x "$BACKUP_DIR/backup-prod.sh"
# Store MySQL password for backup script (fill this in)
echo "CHANGE_ME" > "$BACKUP_DIR/.mysql-password"
chmod 600 "$BACKUP_DIR/.mysql-password"
# Add daily cron at 2am
echo "0 2 * * * root $BACKUP_DIR/backup-prod.sh >> /var/log/kk-backup.log 2>&1" \
    > /etc/cron.d/kk-backup

echo ""
echo "=== Setup complete. Next steps: ==="
echo "1. Run: sudo mysql_secure_installation"
echo "2. Create MySQL databases and user:"
echo "   CREATE DATABASE kk_v1_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE DATABASE kk_v1_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'fastapi_user'@'localhost' IDENTIFIED BY 'CHANGE_ME';"
echo "   GRANT ALL ON kk_v1_dev.* TO 'fastapi_user'@'localhost';"
echo "   GRANT ALL ON kk_v1_prod.* TO 'fastapi_user'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "3. Apply DB migrations to both databases manually."
echo "4. Place .env files in $DEV_DIR and $PROD_DIR/backend/.env"
echo "5. Copy nginx-kk.conf to /etc/nginx/sites-available/kk and symlink it."
echo "6. Run certbot: sudo certbot --nginx -d kuteerakitchen.com -d www.kuteerakitchen.com -d dev.kuteerakitchen.com"
echo "7. Start services: sudo systemctl start kk-backend-dev kk-frontend-dev"
echo "8. Fill in $BACKUP_DIR/.mysql-password with the real DB password."
echo "9. Set GitLab CI/CD variables per the comments in .gitlab-ci.yml."
