-- BUILD waitlist signups (v1: email only).
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id               BIGSERIAL PRIMARY KEY,
  email            TEXT        NOT NULL,
  email_normalized TEXT        NOT NULL,
  source           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_email_normalized_key UNIQUE (email_normalized),
  CONSTRAINT waitlist_signups_email_length CHECK (char_length(email) <= 254),
  CONSTRAINT waitlist_signups_source_length CHECK (source IS NULL OR char_length(source) <= 64)
);
