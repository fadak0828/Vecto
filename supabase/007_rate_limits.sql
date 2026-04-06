-- Rate limiting 테이블 (서버리스 호환, in-memory 불가)
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (ip, endpoint, window_start::date)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(ip, endpoint, window_start);

-- 오래된 rate limit 레코드 자동 정리 (7일 이상)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
  DELETE FROM rate_limits WHERE window_start < now() - interval '7 days';
$$ LANGUAGE sql;

-- Stats 집계 RPC 함수
CREATE OR REPLACE FUNCTION get_daily_stats(ns_id UUID, days INT DEFAULT 7)
RETURNS TABLE(day DATE, total_clicks BIGINT) AS $$
  SELECT clicked_at::date AS day, COUNT(*) AS total_clicks
  FROM click_logs cl
  JOIN slugs s ON cl.slug_id = s.id
  WHERE s.namespace_id = ns_id
    AND cl.clicked_at >= now() - (days || ' days')::interval
  GROUP BY clicked_at::date
  ORDER BY day;
$$ LANGUAGE sql STABLE;
