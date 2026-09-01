/**
 * ponytail: end-to-end public media upload against live S3 (no DB).
 * Run from packages/storage with production S3 env set.
 */
const { PutObjectCommand, HeadObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomBytes } = require("node:crypto");

async function main() {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  const region = process.env.S3_REGION ?? "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET_PUBLIC;
  const ownerId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";
  const aclMode = process.env.S3_PUBLIC_ACCESS_MODE ?? "acl";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.error("Missing S3 env");
    process.exit(1);
  }

  const objectKey = `pub/media/aaaaaaaabbbbccccddddeeeeeeeeeeee/${randomBytes(16).toString("hex")}.webp`;
  const body = Buffer.from("fake-webp-bytes");
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });

  const aclFields =
    aclMode === "acl"
      ? { ACL: "public-read", CacheControl: "public, max-age=31536000, immutable" }
      : {};
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: "image/webp",
    ContentLength: body.length,
    ...aclFields,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 300 });
  const putRes = await fetch(url, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(body.length),
    },
  });
  console.log("objectKey:", objectKey);
  console.log("PUT:", putRes.status, putRes.statusText);
  if (!putRes.ok) {
    console.error(await putRes.text());
    process.exit(1);
  }

  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
  console.log("S3 HEAD contentLength:", head.ContentLength);
  console.log("OK — object is in bucket", bucket);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
