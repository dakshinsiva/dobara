-- Dobara schema. Mirrors src/db/schema.ts. Applied by scripts/migrate.mjs.

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'en',
  cohort text NOT NULL DEFAULT 'running_low',
  cohort_group text NOT NULL DEFAULT 'called',
  brand text NOT NULL DEFAULT 'Cosmix',
  product text,
  flavour text,
  last_order_at date,
  last_summary text,
  do_not_call integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  execution_id text UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  conversation_duration integer NOT NULL DEFAULT 0,
  transcript text,
  summary text,
  extracted jsonb,
  recording_url text,
  total_cost_cents real,
  hangup_reason text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calls_contact_id_idx ON calls (contact_id);
CREATE INDEX IF NOT EXISTS calls_created_at_idx ON calls (created_at DESC);
