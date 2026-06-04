-- Migration: Add notification tracking to call_logs
-- This script adds columns to track callback reminder notifications

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notification_shown BOOLEAN DEFAULT FALSE;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notification_dismissed BOOLEAN DEFAULT FALSE;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notification_last_shown_at TIMESTAMP DEFAULT NULL;

-- Create index for faster queries on pending callbacks
CREATE INDEX IF NOT EXISTS idx_call_logs_callback_pending 
  ON call_logs(callback_scheduled_at, notification_dismissed) 
  WHERE outcome = 'callback' AND notification_dismissed = FALSE;

-- Create index for notification status queries
CREATE INDEX IF NOT EXISTS idx_call_logs_notification_status 
  ON call_logs(notification_shown, notification_last_shown_at);
