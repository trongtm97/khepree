-- Product Studio technical identity: plan internal codes + unique metadata keys

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "internal_code" text;

CREATE UNIQUE INDEX IF NOT EXISTS "plans_product_internal_code_unique"
  ON "plans" ("product_id", "internal_code")
  WHERE "internal_code" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "products_metadata_product_code_unique"
  ON "products" ((metadata->>'productCode'))
  WHERE metadata->>'productCode' IS NOT NULL AND metadata->>'productCode' <> '';

CREATE UNIQUE INDEX IF NOT EXISTS "products_metadata_desktop_protocol_unique"
  ON "products" ((metadata->>'desktopProtocol'))
  WHERE metadata->>'desktopProtocol' IS NOT NULL AND metadata->>'desktopProtocol' <> '';
