#!/usr/bin/env bash
# Kuteera Kitchen — daily PROD MySQL backup
# Schedule with cron: 0 2 * * * /opt/kk-backups/backup-prod.sh
# Keeps 14 days of PROD backups and 7 days of DEV backups.

set -euo pipefail

BACKUP_DIR="/opt/kk-backups"
DATE=$(date +%Y-%m-%d)
MYSQL_USER="fastapi_user"
MYSQL_PASS_FILE="/opt/kk-backups/.mysql-password"  # contains just the password, chmod 600

mkdir -p "$BACKUP_DIR/prod" "$BACKUP_DIR/dev"

MYSQL_PWD=$(cat "$MYSQL_PASS_FILE")
export MYSQL_PWD

# PROD dump
mysqldump -u "$MYSQL_USER" kk_v1_prod \
    --single-transaction \
    --routines \
    --triggers \
    | gzip > "$BACKUP_DIR/prod/kk_v1_prod_$DATE.sql.gz"

# DEV dump (optional — comment out if storage is tight)
mysqldump -u "$MYSQL_USER" kk_v1_dev \
    --single-transaction \
    --routines \
    --triggers \
    | gzip > "$BACKUP_DIR/dev/kk_v1_dev_$DATE.sql.gz"

# Rotate: keep 14 days of PROD, 7 days of DEV
find "$BACKUP_DIR/prod" -name "*.sql.gz" -mtime +14 -delete
find "$BACKUP_DIR/dev"  -name "*.sql.gz" -mtime +7  -delete

unset MYSQL_PWD

echo "Backup complete: $DATE"
