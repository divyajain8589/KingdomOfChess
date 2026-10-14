#!/bin/sh
set -e

echo "Applying database migrations..."
node dist/db/migrate.js

# Demo accounts use a published password, so only seed when explicitly asked (docker-compose.yml does).
if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "Seeding demo data (idempotent)..."
  node dist/db/seed.js
fi

echo "Starting API..."
exec node dist/main.js
