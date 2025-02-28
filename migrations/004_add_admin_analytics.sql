-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metric_type TEXT NOT NULL,
  value JSONB NOT NULL,
  details TEXT
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  metadata JSONB
);

-- Create user activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id),
  action_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT
);

-- Create API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  response_time INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  ip_address TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_item_type ON analytics(item_type);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
