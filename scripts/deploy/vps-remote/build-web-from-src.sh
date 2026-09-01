#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/khepree/.env.production}"
SRC_ARCHIVE="${SRC_ARCHIVE:-/opt/khepree/app/images/khepree-web-src.tar.gz}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/khepree/app/compose.shared-vps.yml}"
BUILD_DIR="${BUILD_DIR:-/tmp/khepree-build}"

get_env() {
  grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-
}

PU=$(get_env POSTGRES_USER)
PP=$(get_env POSTGRES_PASSWORD)
PD=$(get_env POSTGRES_DB)
CDN=$(get_env S3_PUBLIC_BASE_URL)
DBURL="postgresql://${PU}:${PP}@khepree-postgres:5432/${PD}"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
tar -xzf "$SRC_ARCHIVE" -C "$BUILD_DIR"
cd "$BUILD_DIR"

DOCKER_BUILDKIT=0 docker build --network khepree-shared_khepree_internal \
  -t khepree-web:production \
  -f docker/Dockerfile.app \
  --build-arg APP_NAME=web \
  --build-arg APP_FILTER=@khepree/web \
  --build-arg PORT=3000 \
  --build-arg "DATABASE_URL=${DBURL}" \
  --build-arg "S3_PUBLIC_BASE_URL=${CDN}" \
  . 2>&1 | tee /tmp/khepree-web-build.log

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps khepree-web
echo "[build-web-from-src] done"
