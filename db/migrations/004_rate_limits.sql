-- Shared rate-limit counters. Serverless hosting (Vercel) runs many short-lived
-- instances, so per-process memory can't enforce a limit; Postgres can.
-- Buckets are salted hashes (e.g. of an IP or email), never raw values.
CREATE TABLE IF NOT EXISTS waitlist.rate_limits (
  bucket       TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits         INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- Old windows are pruned opportunistically by the app.
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON waitlist.rate_limits (window_start);
