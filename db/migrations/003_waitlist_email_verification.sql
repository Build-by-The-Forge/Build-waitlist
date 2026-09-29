-- Email verification: a signup is only a confirmed waitlist member once the
-- owner of the address clicks the link we email them.
--
-- Existing rows policy: rows created before this migration become 'pending'
-- (the column default). They were never verified, so we don't pretend they
-- were. Pre-launch test rows should be deleted at production cutover
-- (see README, "Production cutover").

ALTER TABLE waitlist.signups
  ADD COLUMN IF NOT EXISTS verification_status           TEXT        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at                   TIMESTAMPTZ,
  -- SHA-256 of the emailed token. The raw token is never stored.
  ADD COLUMN IF NOT EXISTS verification_token_hash       TEXT,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_sent_at          TIMESTAMPTZ,
  -- Sends within the current 24h window, for the per-address daily cap.
  ADD COLUMN IF NOT EXISTS verification_send_count       INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_window_start     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signups_verification_status_check') THEN
    ALTER TABLE waitlist.signups ADD CONSTRAINT signups_verification_status_check
      CHECK (verification_status IN ('pending', 'verified'));
  END IF;

  -- verified <=> verified_at is set
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signups_verified_at_consistent') THEN
    ALTER TABLE waitlist.signups ADD CONSTRAINT signups_verified_at_consistent
      CHECK ((verification_status = 'verified') = (verified_at IS NOT NULL));
  END IF;

  -- Only pending rows may hold a token; verifying must clear it.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signups_token_only_when_pending') THEN
    ALTER TABLE waitlist.signups ADD CONSTRAINT signups_token_only_when_pending
      CHECK (verification_status = 'pending'
             OR (verification_token_hash IS NULL AND verification_token_expires_at IS NULL));
  END IF;
END $$;

-- Token lookup on verify; unique so a hash can only ever point at one signup.
CREATE UNIQUE INDEX IF NOT EXISTS signups_verification_token_hash_key
  ON waitlist.signups (verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

-- Dashboard filters and counts by status.
CREATE INDEX IF NOT EXISTS signups_verification_status_idx
  ON waitlist.signups (verification_status, created_at DESC);
