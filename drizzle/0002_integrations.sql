-- Store integrations (Shopify first) so cohorts build themselves from orders.
-- Mirrors src/db/schema.ts. Applied by scripts/migrate.mjs; idempotent.

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  shop text NOT NULL,
  shop_name text,
  token_encrypted text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'csv';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS order_count integer NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_order_at date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS delivered_at date;
