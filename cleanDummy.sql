-- ============================================================
-- CEMS — CLEANUP SCRIPT
-- Wipes all data and resets all sequences back to 1.
-- Run this when you are ready to go live.
-- ============================================================

BEGIN;

-- Delete in child-first order to respect foreign keys
TRUNCATE TABLE
    follow_up_tasks,
    spoke_escalations,
    spoke_activities,
    spoke_visit_entries,
    spoke_reports,
    call_logs,
    prospect_assignments,
    prospects,
    users
RESTART IDENTITY CASCADE;

COMMIT;

-- Verify everything is empty
SELECT 'users'              AS tbl, COUNT(*) AS rows FROM users
UNION ALL
SELECT 'prospects',                  COUNT(*) FROM prospects
UNION ALL
SELECT 'prospect_assignments',       COUNT(*) FROM prospect_assignments
UNION ALL
SELECT 'call_logs',                  COUNT(*) FROM call_logs
UNION ALL
SELECT 'spoke_reports',              COUNT(*) FROM spoke_reports
UNION ALL
SELECT 'spoke_visit_entries',        COUNT(*) FROM spoke_visit_entries
UNION ALL
SELECT 'spoke_activities',           COUNT(*) FROM spoke_activities
UNION ALL
SELECT 'spoke_escalations',          COUNT(*) FROM spoke_escalations
UNION ALL
SELECT 'follow_up_tasks',            COUNT(*) FROM follow_up_tasks;