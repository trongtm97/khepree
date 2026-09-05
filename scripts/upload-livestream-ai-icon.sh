#!/usr/bin/env bash
# Run on VPS: upload Livestream AI icon to public bucket + link DB row.
# Usage: bash /tmp/upload-livestream-ai-icon.sh /tmp/livestream-icon-512.webp
set -euo pipefail

ICON="${1:?icon path required}"
ENV_FILE="/etc/khepree/.env.production"
WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

set -a
# shellcheck disable=SC1090
source <(sudo grep -E '^(S3_ENDPOINT|S3_REGION|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY|S3_BUCKET_PUBLIC|S3_PUBLIC_BASE_URL|S3_FORCE_PATH_STYLE|S3_PUBLIC_ACCESS_MODE)=' "$ENV_FILE")
set +a

: "${S3_ENDPOINT:?}"
: "${S3_ACCESS_KEY_ID:?}"
: "${S3_SECRET_ACCESS_KEY:?}"
: "${S3_BUCKET_PUBLIC:?}"

HEX1="$(openssl rand -hex 16)"
HEX2="$(openssl rand -hex 16)"
OBJECT_KEY="pub/media/${HEX1}/${HEX2}.webp"
# Match createPublicId("med"): med_ + 16 base64url-ish chars
PUBLIC_ID="med_$(openssl rand -hex 12)"
SIZE="$(wc -c < "$ICON" | tr -d ' ')"
CHECKSUM="$(sha256sum "$ICON" | awk '{print $1}')"
ALT="Khepree Livestream AI"

cd "$WORKDIR"
npm init -y >/dev/null
npm install --silent @aws-sdk/client-s3@3 >/dev/null

cat > upload.mjs <<'EOF'
import { readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const body = readFileSync(process.env.ICON_PATH);
const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, "");
const region = process.env.S3_REGION || "auto";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";
const aclMode = process.env.S3_PUBLIC_ACCESS_MODE || "acl";
const client = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});
const aclFields =
  aclMode === "acl"
    ? { ACL: "public-read", CacheControl: "public, max-age=31536000, immutable" }
    : { CacheControl: "public, max-age=31536000, immutable" };
await client.send(
  new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_PUBLIC,
    Key: process.env.OBJECT_KEY,
    Body: body,
    ContentType: "image/webp",
    ContentLength: body.length,
    ...aclFields,
  }),
);
console.log("uploaded");
EOF

export ICON_PATH="$ICON"
export OBJECT_KEY
node upload.mjs

SQL_FILE="${WORKDIR}/link-icon.sql"
cat > "$SQL_FILE" <<SQL
BEGIN;
WITH product AS (
  SELECT id FROM products WHERE slug = 'khepree-livestream-ai' LIMIT 1
),
ins AS (
  INSERT INTO media_assets (
    public_id, storage_provider, bucket, object_key, mime_type, size_bytes,
    checksum_sha256, width, height, visibility, alt_text, context
  )
  SELECT
    '${PUBLIC_ID}', 's3', 'public', '${OBJECT_KEY}', 'image/webp', ${SIZE},
    '${CHECKSUM}', 512, 512, 'public', '${ALT}', 'product:' || product.id::text
  FROM product
  RETURNING id, public_id, object_key
)
UPDATE products p
SET icon_media_id = ins.id, updated_at = now()
FROM ins, product
WHERE p.id = product.id
RETURNING p.slug, ins.public_id, ins.object_key;
COMMIT;
SQL

docker exec -i khepree-production-postgres-1 \
  psql -U khepree_5ff33b82 -d khepree -v ON_ERROR_STOP=1 < "$SQL_FILE"

BASE="${S3_PUBLIC_BASE_URL:-}"
BASE="${BASE%/}"
echo "OK icon=${PUBLIC_ID} key=${OBJECT_KEY}"
if [[ -n "${BASE}" ]]; then
  echo "URL=${BASE}/${OBJECT_KEY}"
fi
