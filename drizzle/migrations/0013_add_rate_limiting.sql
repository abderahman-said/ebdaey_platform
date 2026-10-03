-- Rate limiting counters (server-side only; never exposed to clients)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: table is service-role / definer only.

CREATE INDEX IF NOT EXISTS rate_limits_updated_at_idx ON public.rate_limits (updated_at);

-- Atomic fixed-window rate limit check.
-- Returns TRUE when the request is allowed, FALSE when the limit is exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _max_hits INTEGER,
  _window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _hits INTEGER;
BEGIN
  INSERT INTO public.rate_limits AS rl (bucket_key, window_start, hits, updated_at)
  VALUES (_key, _now, 1, _now)
  ON CONFLICT (bucket_key) DO UPDATE
    SET hits = CASE
                 WHEN rl.window_start < _now - make_interval(secs => _window_seconds) THEN 1
                 ELSE rl.hits + 1
               END,
        window_start = CASE
                 WHEN rl.window_start < _now - make_interval(secs => _window_seconds) THEN _now
                 ELSE rl.window_start
               END,
        updated_at = _now
  RETURNING rl.hits INTO _hits;

  RETURN _hits <= _max_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Housekeeping: drop stale buckets older than a day
CREATE OR REPLACE FUNCTION public.purge_stale_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE updated_at < now() - interval '1 day';
$$;

REVOKE ALL ON FUNCTION public.purge_stale_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_stale_rate_limits() TO service_role;