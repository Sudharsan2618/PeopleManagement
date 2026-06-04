-- Quick Migration: Add callback notification tracking columns to call_logs table
-- Run this immediately to fix the "column does not exist" error

-- Add notification columns if they don't exist
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS notification_shown BOOLEAN DEFAULT FALSE;

ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS notification_dismissed BOOLEAN DEFAULT FALSE;

ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS notification_last_shown_at TIMESTAMP DEFAULT NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_call_logs_callback_pending 
  ON call_logs(callback_scheduled_at, notification_dismissed) 
  WHERE outcome = 'callback' AND notification_dismissed = FALSE;

CREATE INDEX IF NOT EXISTS idx_call_logs_notification_status 
  ON call_logs(notification_shown, notification_last_shown_at);

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'call_logs' 
AND column_name IN ('notification_shown', 'notification_dismissed', 'notification_last_shown_at')
ORDER BY ordinal_position;
