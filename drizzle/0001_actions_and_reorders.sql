-- Follow-up actions, reorder tracking for the lift metric, and the call channel (phone | web).
-- Mirrors src/db/schema.ts. Applied by scripts/migrate.mjs; idempotent.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reordered_at date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reorder_source text;

ALTER TABLE calls ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'phone';

CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  type text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS actions_status_idx ON actions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS actions_call_id_idx ON actions (call_id);
