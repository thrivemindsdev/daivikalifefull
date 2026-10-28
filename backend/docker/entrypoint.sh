#!/bin/sh
# Prepares the app on every container start, then hands over to Apache.
set -e
cd /var/www/html

if [ -z "$APP_KEY" ]; then
  echo "APP_KEY is not set. Generate one with: php artisan key:generate --show" >&2
  exit 1
fi

# Cache the configuration (reads the container's environment variables)
php artisan config:cache
php artisan route:cache

# Create any missing store tables. Existing tables and data are never changed or dropped.
# Retries while the database container is still starting.
tries=0
until php artisan migrate --force; do
  tries=$((tries + 1))
  if [ "$tries" -ge 10 ]; then
    echo "Database is not reachable; starting without migrating." >&2
    break
  fi
  echo "Waiting for the database ($tries/10)..." >&2
  sleep 3
done

chown -R www-data:www-data storage bootstrap/cache
exec "$@"
