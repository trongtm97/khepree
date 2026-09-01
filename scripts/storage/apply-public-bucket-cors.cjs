/**
 * Apply browser-upload CORS on the public S3 bucket (Vietnix / S3-compatible).
 * Usage: node scripts/storage/apply-public-bucket-cors.cjs
 * Requires S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_PUBLIC in env.
 */
const { PutBucketCorsCommand, S3Client } = require("@aws-sdk/client-s3");

const ORIGINS = [
  "https://admin.khepree.com",
  "https://account.khepree.com",
];

async function main() {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  const region = process.env.S3_REGION ?? "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET_PUBLIC;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.error("Missing S3 env (S3_ENDPOINT, keys, S3_BUCKET_PUBLIC)");
    process.exit(1);
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });

  const corsConfiguration = {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["PUT", "GET", "HEAD"],
        AllowedOrigins: ORIGINS,
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: corsConfiguration,
    }),
  );

  console.log("CORS applied on bucket:", bucket);
  console.log("Origins:", ORIGINS.join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
