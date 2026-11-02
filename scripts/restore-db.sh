#!/usr/bin/env bash
# ==============================================================================
# Daivika Database Restore Script
# ==============================================================================
# Usage:
#   ./scripts/restore-db.sh backups/daivika_db_YYYYMMDD_HHMMSS.sql.gz
# ==============================================================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path-to-backup-file.sql.gz>"
  echo "Example: $0 backups/daivika_db_20261102_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[-] ERROR: File '${BACKUP_FILE}' does not exist!" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load environment
if [ -f "${PROJECT_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-daivika_user}"
DB_NAME="${POSTGRES_DB:-daivika_db}"

echo "=================================================="
echo " WARNING: THIS WILL OVERWRITE DATA IN '${DB_NAME}'!"
echo " Backup source: ${BACKUP_FILE}"
echo " Database: ${DB_NAME}"
echo " User: ${DB_USER}"
echo "=================================================="
read -r -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore aborted."
  exit 0
fi

cd "${PROJECT_DIR}"

if docker compose version >/dev/null 2>&1 && docker compose ps postgres 2>&1 | grep -q "postgres"; then
  echo "Restoring into Docker Compose 'postgres' service..."
  gunzip -c "${BACKUP_FILE}" | docker compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}"
elif docker-compose version >/dev/null 2>&1 && docker-compose ps postgres 2>&1 | grep -q "postgres"; then
  echo "Restoring into docker-compose 'postgres' service..."
  gunzip -c "${BACKUP_FILE}" | docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}"
else
  echo "Restoring via local psql..."
  PGPASSWORD="${POSTGRES_PASSWORD:-}" gunzip -c "${BACKUP_FILE}" | psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}"
fi

echo "=================================================="
echo " Database restoration completed successfully!"
echo "=================================================="

