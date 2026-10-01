-- Up to three active administrators (was: exactly one).
--
-- Each active admin occupies a numbered seat 1..3. UNIQUE(admin_slot) among
-- active rows makes a fourth active admin impossible and keeps concurrent
-- bootstraps race-safe without triggers or locks. Disabled rows keep or drop
-- their seat freely; only active rows compete for seats.
--
-- Replaces admin_users_single_active from 002. Safe to apply before or after
-- deploying the matching code: existing sign-in paths never set admin_slot
-- except bootstrap, which only runs with the new code.

ALTER TABLE waitlist.admin_users ADD COLUMN IF NOT EXISTS admin_slot SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_slot_range') THEN
    ALTER TABLE waitlist.admin_users ADD CONSTRAINT admin_users_slot_range
      CHECK (admin_slot IS NULL OR admin_slot BETWEEN 1 AND 3);
  END IF;
END $$;

-- Give every existing active admin a seat, in creation order.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS seat
  FROM waitlist.admin_users
  WHERE status = 'active' AND admin_slot IS NULL
)
UPDATE waitlist.admin_users u SET admin_slot = r.seat
FROM ranked r WHERE u.id = r.id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_active_needs_slot') THEN
    ALTER TABLE waitlist.admin_users ADD CONSTRAINT admin_users_active_needs_slot
      CHECK (status <> 'active' OR admin_slot IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_active_slot
  ON waitlist.admin_users (admin_slot)
  WHERE status = 'active';

DROP INDEX IF EXISTS waitlist.admin_users_single_active;
