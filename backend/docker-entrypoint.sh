#!/bin/sh
set -e

echo "Applying database migrations..."
node dist/db/migrate.js

echo "Seeding demo data (idempotent)..."
node dist/db/seed.js

echo "Starting API..."
exec node dist/main.js
