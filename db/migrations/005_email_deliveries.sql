-- One row per provider attempt at sending a logical email (e.g. a
-- verification link). Answers "how often is the fallback used?" and
-- "which provider sent this person's link?" without logs.
-- Never holds tokens, URLs or message content.
CREATE TABLE IF NOT EXISTS waitlist.email_deliveries (
  id                  BIGSERIAL PRIMARY KEY,
  -- Stable id of the logical email; also sent to providers as the idempotency key.
  message_id          UUID        NOT NULL,
  signup_id           BIGINT      REFERENCES waitlist.signups (id) ON DELETE CASCADE,
  message_type        TEXT        NOT NULL,
  provider            TEXT        NOT NULL,
  status              TEXT        NOT NULL,
  failure_class       TEXT,
  error_code          TEXT,
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Each provider is tried at most once per logical email.
  CONSTRAINT email_deliveries_message_provider_key UNIQUE (message_id, provider),
  CONSTRAINT email_deliveries_status_check CHECK (status IN ('sent', 'failed')),
  CONSTRAINT email_deliveries_failure_check CHECK (
    (status = 'sent' AND failure_class IS NULL)
    OR (status = 'failed' AND failure_class IN ('transient', 'unknown', 'permanent', 'configuration'))
  )
);

CREATE INDEX IF NOT EXISTS email_deliveries_signup_idx ON waitlist.email_deliveries (signup_id);
CREATE INDEX IF NOT EXISTS email_deliveries_created_at_idx ON waitlist.email_deliveries (created_at);
