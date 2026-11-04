#!/usr/bin/env bash
# ==============================================================================
# Daivika Database Backup Script (PostgreSQL / Docker Compose / Standalone)
# ==============================================================================
# Usage:
#   ./scripts/backup-db.sh
#   Or set up in cron: 0 2 * * * /path/to/project/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
# ==============================================================================

set -euo pipefail

# 1. Resolve Project Root Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

# 2. Load Environment Variables (checking root .env and backend/.env)
if [ -f "${PROJECT_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

if [ -f "${PROJECT_DIR}/backend/.env" ]; then
  # Extract DATABASE_URL or specific variables if set
  if [ -z "${POSTGRES_PASSWORD:-}" ] && grep -q "DATABASE_URL" "${PROJECT_DIR}/backend/.env"; then
    DB_URL=$(grep "^DATABASE_URL=" "${PROJECT_DIR}/backend/.env" | cut -d '=' -f2-)
  fi
fi

# Default fallback values matching docker-compose.yml
DB_USER="${POSTGRES_USER:-daivika_user}"
DB_NAME="${POSTGRES_DB:-daivika_db}"
BACKUP_FILE="${BACKUP_DIR}/daivika_db_${TIMESTAMP}.sql.gz"

echo "=================================================="
echo " Starting Daivika PostgreSQL Backup: $(date)"
echo " Project Directory: ${PROJECT_DIR}"
echo " Destination: ${BACKUP_FILE}"
echo "=================================================="

# 3. Detect Docker Compose binary
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD=""
fi

# 4. Perform the dump
cd "${PROJECT_DIR}"

if [ -n "${COMPOSE_CMD}" ] && ${COMPOSE_CMD} ps postgres 2>&1 | grep -q "postgres"; then
  echo "[1/3] Dumping database from Docker container 'postgres'..."
  # Use docker compose exec with -T to prevent TTY issues in cron
  ${COMPOSE_CMD} exec -T postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
elif command -v pg_dump >/dev/null 2>&1; then
  echo "[1/3] Docker container not active; dumping via local pg_dump..."
  if [ -n "${DATABASE_URL:-}" ]; then
    pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
  else
    PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
  fi
else
  echo "[-] ERROR: Neither running Docker compose postgres container nor pg_dump binary found!" >&2
  exit 1
fi

# 5. Verify Backup
if [ -s "${BACKUP_FILE}" ]; then
  FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[2/3] Backup successful! File created: ${BACKUP_FILE} (${FILESIZE})"
else
  echo "[-] ERROR: Backup file is empty or missing!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# 6. Clean up old backups (retention policy)
echo "[3/3] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "daivika_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -v {} \;

echo "Backup finished successfully at $(date)."
echo "=================================================="

