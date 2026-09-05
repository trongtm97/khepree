/**
 * One-shot: upload Livestream AI icon to public S3 and link products.icon_media_id.
 * Expects production S3_* + DATABASE_URL in env. Does not print secrets.
 *
 * Usage (on VPS or with prod env):
 *   node scripts/upload-livestream-ai-icon.mjs /path/to/icon-512.webp
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const PRODUCT_SLUG = "khepree-livestream-ai";
const ALT = "Khepree Livestream AI";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error("Usage: node upload-livestream-ai-icon.mjs <icon.webp>");

  const body = readFileSync(filePath);
  const endpoint = requireEnv("S3_ENDPOINT").replace(/\/$/, "");
  const region = process.env.S3_REGION ?? "auto";
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const bucket = requireEnv("S3_BUCKET_PUBLIC");
  const publicBase = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";
  const aclMode = process.env.S3_PUBLIC_ACCESS_MODE ?? "acl";
  const databaseUrl = requireEnv("DATABASE_URL");

  const objectKey = `pub/media/${randomBytes(16).toString("hex")}/${randomBytes(16).toString("hex")}.webp`;
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });

  const aclFields =
    aclMode === "acl"
      ? { ACL: "public-read", CacheControl: "public, max-age=31536000, immutable" }
      : { CacheControl: "public, max-age=31536000, immutable" };

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: "image/webp",
      ContentLength: body.length,
      ...aclFields,
    }),
  );

  const checksum = createHash("sha256").update(body).digest("hex");
  const publicId = `med_${randomBytes(8).toString("base64url").slice(0, 16)}`;

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const product = await pool.query(
      `SELECT id FROM products WHERE slug = $1 LIMIT 1`,
      [PRODUCT_SLUG],
    );
    if (!product.rows[0]) throw new Error(`Product ${PRODUCT_SLUG} not found`);

    const media = await pool.query(
      `INSERT INTO media_assets (
         public_id, storage_provider, bucket, object_key, mime_type, size_bytes,
         checksum_sha256, width, height, visibility, alt_text, context
       ) VALUES (
         $1, 's3', 'public', $2, 'image/webp', $3,
         $4, 512, 512, 'public', $5, $6
       ) RETURNING id, public_id, object_key`,
      [publicId, objectKey, body.length, checksum, ALT, `product:${product.rows[0].id}`],
    );

    await pool.query(
      `UPDATE products SET icon_media_id = $1, updated_at = now() WHERE id = $2`,
      [media.rows[0].id, product.rows[0].id],
    );

    const url = publicBase ? `${publicBase}/${objectKey}` : objectKey;
    console.log(
      JSON.stringify({
        ok: true,
        productSlug: PRODUCT_SLUG,
        mediaPublicId: media.rows[0].public_id,
        objectKey: media.rows[0].object_key,
        url,
      }),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
