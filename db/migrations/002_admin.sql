-- Waitlist administrators. There is no public admin signup: authenticating with
-- Google never grants access by itself; only identities present here with
-- status = 'active' may use the dashboard.
CREATE TABLE IF NOT EXISTS waitlist.admin_users (
  id               BIGSERIAL PRIMARY KEY,
  email            TEXT        NOT NULL,
  provider         TEXT        NOT NULL DEFAULT 'google',
  -- OAuth "sub": the stable identity. NULL only for an admin provisioned by
  -- email who hasn't signed in yet; bound on their first verified sign-in.
  provider_subject TEXT,
  role             TEXT        NOT NULL DEFAULT 'admin',
  status           TEXT        NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ,
  CONSTRAINT admin_users_email_key UNIQUE (email),
  CONSTRAINT admin_users_subject_key UNIQUE (provider, provider_subject),
  CONSTRAINT admin_users_email_lower CHECK (email = lower(email)),
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin')),
  CONSTRAINT admin_users_status_check CHECK (status IN ('active', 'disabled'))
);

-- v1 policy: at most ONE active administrator, enforced by the database so no
-- code path (or concurrent bootstrap) can ever create a second.
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_single_active
  ON waitlist.admin_users (status)
  WHERE status = 'active';

-- Append-only record of sensitive admin actions (sign-ins, exports).
CREATE TABLE IF NOT EXISTS waitlist.admin_audit (
  id         BIGSERIAL PRIMARY KEY,
  admin_id   BIGINT      REFERENCES waitlist.admin_users (id),
  action     TEXT        NOT NULL,
  detail     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
