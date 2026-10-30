-- Order history per customer, so cohorts, replenishment windows and segments
-- come from real purchase dates instead of first/last order only.
-- Mirrors src/db/schema.ts. Applied by scripts/migrate.mjs; idempotent.

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  external_id text NOT NULL UNIQUE,
  ordered_at date NOT NULL,
  delivered_at date,
  product text,
  flavour text,
  quantity integer NOT NULL DEFAULT 1,
  total real,
  currency text,
  discounted integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'shopify',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_contact_id_idx ON orders (contact_id, ordered_at);
CREATE INDEX IF NOT EXISTS orders_ordered_at_idx ON orders (ordered_at);
