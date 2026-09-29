-- Least-privilege role for the waitlist website. Run once as a database owner
-- AFTER `npm run db:migrate`, then use this role's credentials in DATABASE_URL.
-- Not applied automatically: role management needs owner rights and a real
-- password, which don't belong in the migration history.
--
--   psql "$OWNER_DATABASE_URL" -v app_password="'<strong password>'" -f db/roles.sql

CREATE ROLE waitlist_app LOGIN PASSWORD :app_password;

-- The site can only see the waitlist schema: nothing from the BUILD platform.
GRANT USAGE ON SCHEMA waitlist TO waitlist_app;

-- Public signups insert; the admin dashboard reads. Email verification may
-- only touch its own columns. No DELETE.
GRANT SELECT, INSERT ON waitlist.signups TO waitlist_app;
GRANT UPDATE (
  verification_status, verified_at, verification_token_hash, verification_token_expires_at,
  verification_sent_at, verification_send_count, verification_window_start, updated_at
) ON waitlist.signups TO waitlist_app;
GRANT USAGE ON SEQUENCE waitlist.signups_id_seq TO waitlist_app;

-- Sign-in may bootstrap the first admin, bind a provisioned admin's Google
-- identity, and record the login time. Status and role changes (adding,
-- disabling, replacing admins) stay with the database owner.
GRANT SELECT, INSERT ON waitlist.admin_users TO waitlist_app;
GRANT UPDATE (provider_subject, last_login_at) ON waitlist.admin_users TO waitlist_app;
GRANT USAGE ON SEQUENCE waitlist.admin_users_id_seq TO waitlist_app;

-- Email delivery attempts are append-only for the app.
GRANT SELECT, INSERT ON waitlist.email_deliveries TO waitlist_app;
GRANT USAGE ON SEQUENCE waitlist.email_deliveries_id_seq TO waitlist_app;

-- Shared rate-limit counters (hashed buckets only).
GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist.rate_limits TO waitlist_app;

-- Audit log is append-only for the app.
GRANT SELECT, INSERT ON waitlist.admin_audit TO waitlist_app;
GRANT USAGE ON SEQUENCE waitlist.admin_audit_id_seq TO waitlist_app;
