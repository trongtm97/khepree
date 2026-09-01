/**
 * ponytail: one-shot S3 upload probe — run on VPS api container.
 * docker exec khepree-api node /tmp/probe.cjs
 */
const { PutObjectCommand, HeadObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
const region = process.env.S3_REGION ?? "auto";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET_PUBLIC;
const forcePathStyleEnv = process.env.S3_FORCE_PATH_STYLE === "true";
const aclMode = process.env.S3_PUBLIC_ACCESS_MODE ?? "acl";
const key = `_health/probe-${Date.now()}.bin`;
const body = Buffer.from("khepree-probe");

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Missing S3 env");
  process.exit(1);
}

function client(pathStyle) {
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: pathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function presignPut(c, withAcl) {
  const aclFields =
    withAcl && aclMode === "acl"
      ? { ACL: "public-read", CacheControl: "public, max-age=31536000, immutable" }
      : {};
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "application/octet-stream",
    ContentLength: body.length,
    ...aclFields,
  });
  const url = await getSignedUrl(c, command, { expiresIn: 300 });
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Length": String(body.length),
    ...(withAcl && aclMode === "acl" ? { "x-amz-acl": "public-read" } : {}),
  };
  return { url, headers };
}

async function tryUpload(label, pathStyle, withAcl, sendAclHeader) {
  const c = client(pathStyle);
  const { url, headers } = await presignPut(c, withAcl);
  if (!sendAclHeader) delete headers["x-amz-acl"];
  console.log(`\n[${label}] presigned URL: ${url.slice(0, 140)}...`);
  const res = await fetch(url, { method: "PUT", body, headers });
  console.log(`[${label}] PUT status: ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log(`[${label}] PUT body: ${text.slice(0, 400)}`);
    return false;
  }
  const head = await c.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  console.log(`[${label}] HEAD contentLength: ${head.ContentLength}`);
  const apiUrl = pathStyle ? `${endpoint}/${bucket}/${key}` : `${endpoint}/${key}`;
  const pubHead = await fetch(apiUrl, { method: "HEAD" });
  console.log(`[${label}] anonymous HEAD: ${pubHead.status}`);
  return true;
}

async function main() {
  console.log(
    `endpoint=${endpoint} bucket=${bucket} envForcePathStyle=${forcePathStyleEnv} aclMode=${aclMode}`,
  );
  const results = [];
  results.push(await tryUpload("pathStyle=false+acl", false, true, true));
  results.push(await tryUpload("pathStyle=true+acl", true, true, true));
  results.push(await tryUpload("pathStyle=true+aclNoHeader", true, true, false));
  results.push(await tryUpload("pathStyle=true+noAclHeader", true, false, false));
  console.log("\nSummary:", results.join(","));
  process.exit(results.some(Boolean) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
