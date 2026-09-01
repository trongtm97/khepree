-- Idempotent: register Khepree Novel AI desktop OAuth client for production (Product Studio identity).
-- Safe to rerun — uses WHERE NOT EXISTS patterns.

INSERT INTO products (public_id, slug, status, platform_capabilities, licensing_mode, metadata)
SELECT
  'prod_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  'khepree-novel-ai',
  'hidden',
  '["desktop"]'::jsonb,
  'LICENSE_KEY_DEVICE',
  '{"app": "Khepree Novel AI", "productCode": "KHEPREE_NOVEL_AI", "accessFeatureKey": "novel_ai.access", "desktopProtocol": "khepreenovelai"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'khepree-novel-ai');

INSERT INTO desktop_clients (client_id, product_id, display_name, allowed_redirect_uris, status)
SELECT
  'khepree.novel-ai.desktop',
  p.id,
  'Khepree Novel AI',
  '["khepreenovelai://auth/callback"]'::jsonb,
  'active'
FROM products p
WHERE p.slug = 'khepree-novel-ai'
  AND NOT EXISTS (SELECT 1 FROM desktop_clients WHERE client_id = 'khepree.novel-ai.desktop');

SELECT dc.client_id, dc.display_name, dc.allowed_redirect_uris, dc.status, p.slug AS product_slug
FROM desktop_clients dc
JOIN products p ON p.id = dc.product_id
WHERE dc.client_id = 'khepree.novel-ai.desktop';
