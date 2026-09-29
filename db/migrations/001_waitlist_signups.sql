-- BUILD waitlist signups (v1: email only).
-- Lives in its own schema so it stays logically separate from BUILD platform
-- data, even when both share a Postgres server.
CREATE SCHEMA IF NOT EXISTS waitlist;

CREATE TABLE IF NOT EXISTS waitlist.signups (
  id               BIGSERIAL PRIMARY KEY,
  email            TEXT        NOT NULL,
  email_normalized TEXT        NOT NULL,
  source           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signups_email_normalized_key UNIQUE (email_normalized),
  CONSTRAINT signups_email_length CHECK (char_length(email) <= 254),
  CONSTRAINT signups_source_length CHECK (source IS NULL OR char_length(source) <= 64)
);

-- Admin list is ordered newest first.
CREATE INDEX IF NOT EXISTS signups_created_at_idx ON waitlist.signups (created_at DESC);
