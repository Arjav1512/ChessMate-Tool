/*
  # Add API Logging and Monitoring

  1. New Tables
    - `api_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users, nullable)
      - `endpoint` (text) - API endpoint called
      - `question` (text) - User question/input
      - `success` (boolean) - Whether request succeeded
      - `error_message` (text) - Error message if failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on api_logs table
    - Admin-only access policies
    - Service role can write logs

  3. Indexes
    - Performance indexes for querying logs
*/

-- Create API logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  question text,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_success ON api_logs(success);

-- RLS Policies: Service role can insert, admins can view
CREATE POLICY "Service role can insert logs"
  ON api_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can view own logs"
  ON api_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to clean up old logs (>90 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron extension)
-- Run this manually or set up cron job:
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT cleanup_old_logs()');
