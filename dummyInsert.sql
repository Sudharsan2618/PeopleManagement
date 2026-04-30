-- ============================================================
-- CEMS — DUMMY DATA
-- Run this AFTER cems_schema.sql
-- ============================================================


-- ------------------------------------------------------------
-- 1. USERS
--    1 Admin · 3 Telecallers · 2 Spoke agents
-- ------------------------------------------------------------
INSERT INTO users (name, email, mobile, password, role, is_active) VALUES
  ('Ravi Kumar',      'admin@cems.in',      '9876500001', 'admin123',      'admin',      TRUE),
  ('Priya Nair',      'caller@cems.in',     '9876500002', 'caller123',     'telecaller', TRUE),
  ('Arjun Mehta',     'arjun@cems.in',     '9876500003', 'caller123',     'telecaller', TRUE),
  ('Sneha Iyer',      'sneha@cems.in',     '9876500004', 'caller123',     'telecaller', TRUE),
  ('Karthik Raj',     'spoke@cems.in',   '9876500005', 'spoke123',      'spoke',      TRUE),
  ('Divya Suresh',    'divya@cems.in',     '9876500006', 'spoke123',      'spoke',      TRUE);

-- user ids: admin=1, telecallers=2,3,4, spoke=5,6


-- ------------------------------------------------------------
-- 2. PROSPECTS
--    15 students across various pipeline stages
-- ------------------------------------------------------------
INSERT INTO prospects (name, mobile, email, location, sourced_from, status, course_interest, created_by) VALUES
  ('Aarav Sharma',     '9500011001', 'aarav@gmail.com',     'Chennai',      'school_visit',  'new',                 'Course A',  1),
  ('Bhavya Reddy',     '9500011002', 'bhavya@gmail.com',    'Trichy',       'referral',       'new',                 'Course B',  1),
  ('Chirag Patel',     '9500011003', NULL,                  'Coimbatore',   'school_visit',   'contacted',           'Course A',  1),
  ('Deepa Menon',      '9500011004', 'deepa@gmail.com',     'Chennai',      'walk_in',        'contacted',           'Unknown',   1),
  ('Esha Joshi',       '9500011005', NULL,                  'Madurai',      'school_visit',   'warm',                'Course C',  1),
  ('Farhan Siddiqui',  '9500011006', 'farhan@gmail.com',    'Pondicherry',  'coaching_centre','warm',                'Course B',  1),
  ('Geetha Lakshmi',   '9500011007', NULL,                  'Salem',        'alumni',         'hot',                 'Course A',  1),
  ('Hari Prasad',      '9500011008', 'hari@gmail.com',      'Chennai',      'referral',       'hot',                 'Course C',  1),
  ('Ishaan Verma',     '9500011009', NULL,                  'Vellore',      'school_visit',   'visit_scheduled',     'Course A',  1),
  ('Jyoti Pillai',     '9500011010', 'jyoti@gmail.com',     'Trichy',       'walk_in',        'visit_done',          'Course B',  1),
  ('Kiran Babu',       '9500011011', NULL,                  'Coimbatore',   'school_visit',   'admission_done',      'Course A',  1),
  ('Lavanya Nair',     '9500011012', 'lavanya@gmail.com',   'Chennai',      'coaching_centre','cold_no_response',    'Unknown',   1),
  ('Mohan Das',        '9500011013', NULL,                  'Madurai',      'referral',       'cold_not_interested', 'Course C',  1),
  ('Nisha Kumari',     '9500011014', 'nisha@gmail.com',     'Pondicherry',  'school_visit',   'lost',                'Course B',  1),
  ('Om Prakash',       '9500011015', NULL,                  'Salem',        'walk_in',        'new',                 'Course A',  1);

-- prospect ids: 1–15


-- ------------------------------------------------------------
-- 3. PROSPECT ASSIGNMENTS
--    Today's assignments across 3 telecallers
-- ------------------------------------------------------------
INSERT INTO prospect_assignments (prospect_id, telecaller_id, assigned_by, assigned_date) VALUES
  -- Priya (telecaller id=2) gets prospects 1,2,3,4,5
  (1,  2, 1, CURRENT_DATE),
  (2,  2, 1, CURRENT_DATE),
  (3,  2, 1, CURRENT_DATE),
  (4,  2, 1, CURRENT_DATE),
  (5,  2, 1, CURRENT_DATE),
  -- Arjun (telecaller id=3) gets prospects 6,7,8,9,10
  (6,  3, 1, CURRENT_DATE),
  (7,  3, 1, CURRENT_DATE),
  (8,  3, 1, CURRENT_DATE),
  (9,  3, 1, CURRENT_DATE),
  (10, 3, 1, CURRENT_DATE),
  -- Sneha (telecaller id=4) gets prospects 11,12,13,14,15
  (11, 4, 1, CURRENT_DATE),
  (12, 4, 1, CURRENT_DATE),
  (13, 4, 1, CURRENT_DATE),
  (14, 4, 1, CURRENT_DATE),
  (15, 4, 1, CURRENT_DATE);

-- assignment ids: 1–15


-- ------------------------------------------------------------
-- 4. CALL LOGS
--    Realistic call outcomes mapped to current prospect statuses
-- ------------------------------------------------------------
INSERT INTO call_logs (prospect_id, telecaller_id, assignment_id, outcome, status_after_call, reason, notes, course_interest, callback_scheduled_at, called_at) VALUES

  -- Prospect 3 (Chirag) – contacted, called once, not answered, retried
  (3,  2, 3,  'not_answered',    'contacted',           NULL,
   'First attempt, no answer',                          'Course A', NULL,
   NOW() - INTERVAL '3 hours'),

  (3,  2, 3,  'not_answered',    'contacted',           NULL,
   'Second attempt, still no answer',                   'Course A', NULL,
   NOW() - INTERVAL '2 hours'),

  -- Prospect 4 (Deepa) – contacted, showed some interest, callback set
  (4,  2, 4,  'callback',        'contacted',           NULL,
   'Asked to call back after 5pm',                      'Unknown',
   NOW() + INTERVAL '4 hours',
   NOW() - INTERVAL '1 hour'),

  -- Prospect 5 (Esha) – warm, interested, info gathered
  (5,  2, 5,  'interested',      'warm',                NULL,
   'Interested in Course C. Online mode preferred. Parent aware.',
   'Course C', NULL,
   NOW() - INTERVAL '30 minutes'),

  -- Prospect 6 (Farhan) – warm
  (6,  3, 6,  'interested',      'warm',                NULL,
   'Interested in Course B. Prefers offline. Best time mornings.',
   'Course B', NULL,
   NOW() - INTERVAL '2 hours'),

  -- Prospect 7 (Geetha) – hot, strong interest
  (7,  3, 7,  'interested',      'warm',                NULL,
   'Very keen on Course A, asked about fees.',          'Course A', NULL,
   NOW() - INTERVAL '5 hours'),

  (7,  3, 7,  'qualified',       'hot',                 NULL,
   'Parent spoke as well, confirmed Course A. Ready for campus visit.',
   'Course A', NULL,
   NOW() - INTERVAL '1 hour'),

  -- Prospect 8 (Hari) – hot
  (8,  3, 8,  'interested',      'warm',                NULL,
   'Asked about Course C placements.',                  'Course C', NULL,
   NOW() - INTERVAL '3 hours'),

  (8,  3, 8,  'qualified',       'hot',                 NULL,
   'Confirmed interest after follow-up. Scheduling visit.',
   'Course C', NULL,
   NOW() - INTERVAL '45 minutes'),

  -- Prospect 9 (Ishaan) – visit scheduled
  (9,  3, 9,  'qualified',       'visit_scheduled',     NULL,
   'Campus visit confirmed for this Saturday.',         'Course A', NULL,
   NOW() - INTERVAL '1 day'),

  -- Prospect 10 (Jyoti) – visit done, pending decision
  (10, 3, 10, 'qualified',       'visit_done',          NULL,
   'Visited campus, family liked it. Will confirm in 2 days.',
   'Course B', NULL,
   NOW() - INTERVAL '2 days'),

  -- Prospect 11 (Kiran) – admission done
  (11, 4, 11, 'qualified',       'admission_done',      NULL,
   'Fee paid. Enrolled in Course A.',                   'Course A', NULL,
   NOW() - INTERVAL '3 days'),

  -- Prospect 12 (Lavanya) – cold no response (3 attempts)
  (12, 4, 12, 'not_answered',    'contacted',           NULL,
   'Attempt 1',                                         'Unknown', NULL,
   NOW() - INTERVAL '3 days'),

  (12, 4, 12, 'not_answered',    'contacted',           NULL,
   'Attempt 2',                                         'Unknown', NULL,
   NOW() - INTERVAL '2 days'),

  (12, 4, 12, 'not_answered',    'cold_no_response',    NULL,
   'Attempt 3 – marked unreachable',                    'Unknown', NULL,
   NOW() - INTERVAL '1 day'),

  -- Prospect 13 (Mohan) – not interested
  (13, 4, 13, 'not_interested',  'cold_not_interested', 'Already planning a gap year',
   'Clearly said not interested at this time.',         'Course C', NULL,
   NOW() - INTERVAL '2 days'),

  -- Prospect 14 (Nisha) – lost to competitor
  (14, 4, 14, 'enrolled_elsewhere', 'lost',             NULL,
   'Joined a private college in Pondicherry.',          'Course B', NULL,
   NOW() - INTERVAL '1 day');


-- ------------------------------------------------------------
-- 5. SPOKE REPORTS (2 reports — one per spoke agent)
-- ------------------------------------------------------------
INSERT INTO spoke_reports (spoke_id, report_date, area_location, is_draft, submitted_at) VALUES
  (5, CURRENT_DATE,              'Poonamallee, Chennai',   FALSE, NOW() - INTERVAL '2 hours'),
  (6, CURRENT_DATE - INTERVAL '1 day', 'Trichy',          FALSE, NOW() - INTERVAL '1 day');

-- report ids: 1, 2


-- ------------------------------------------------------------
-- 6. SPOKE VISIT ENTRIES
-- ------------------------------------------------------------
INSERT INTO spoke_visit_entries
  (report_id, visit_type, institution_name, contact_name, contact_email, contact_mobile,
   next_action, follow_up_role, follow_up_user_id, follow_up_date) VALUES

  -- Report 1 – Karthik's visits today (Poonamallee)
  (1, 'school',            'St. Joseph Matric Hr Sec School',
   'Mr. Selvam',          'selvam@stjoseph.in',   '9443300001',
   'Share brochures and schedule a student awareness session',
   'telecaller', 2, CURRENT_DATE + INTERVAL '2 days'),

  (1, 'school',            'Poonamallee Govt Higher Secondary',
   'Mrs. Kamala',         NULL,                   '9443300002',
   'Follow up with principal for permission to address students',
   'self', 5, CURRENT_DATE + INTERVAL '3 days'),

  (1, 'coaching_centre',   'Brilliant Tutorials Poonamallee',
   'Mr. Ramesh',          'ramesh@brilliant.in',  '9443300003',
   'Discuss tie-up model, share referral incentive plan',
   'telecaller', 3, CURRENT_DATE + INTERVAL '1 day'),

  (1, 'admission_partner', 'Suresh Education Consultants',
   'Mr. Suresh',          'suresh@sec.in',        '9443300004',
   'Send partnership agreement draft',
   'self', 5, CURRENT_DATE + INTERVAL '5 days'),

  -- Report 2 – Divya's visits yesterday (Trichy)
  (2, 'school',            'Bishop Heber Hr Sec School',
   'Ms. Anitha',          'anitha@bhss.in',       '9443300005',
   'Call back to confirm permission for campus awareness talk',
   'telecaller', 4, CURRENT_DATE),

  (2, 'coaching_centre',   'IIT Coaching Hub Trichy',
   'Mr. Prakash',         NULL,                   '9443300006',
   'Share student testimonials and arrange a demo session',
   'self', 6, CURRENT_DATE + INTERVAL '2 days');

-- visit entry ids: 1–6


-- ------------------------------------------------------------
-- 7. SPOKE ACTIVITIES
-- ------------------------------------------------------------
INSERT INTO spoke_activities (report_id, activity_type, done, notes) VALUES
  -- Karthik's report
  (1, 'branding',  TRUE,  'Distributed 150 pamphlets and placed 3 standees near Poonamallee bus stand and 2 schools'),
  (1, 'alumni',    TRUE,  'Connected with 2 alumni (Vikram, Preethi) — both agreed to refer friends, 1 warm lead captured'),
  (1, 'corporate', FALSE, NULL),
  (1, 'referral',  TRUE,  'Built referral chain via Vikram — referred 3 Class 12 pass-outs, follow-up needed'),

  -- Divya's report
  (2, 'branding',  TRUE,  'Placed banners near 2 coaching centres in Trichy, distributed 80 pamphlets'),
  (2, 'alumni',    FALSE, NULL),
  (2, 'corporate', TRUE,  'Met HR at Trichy Textiles Ltd — interested in employee sibling referrals, shared brochure'),
  (2, 'referral',  FALSE, NULL);


-- ------------------------------------------------------------
-- 8. SPOKE ESCALATIONS
-- ------------------------------------------------------------
INSERT INTO spoke_escalations (report_id, description, observations, resolved_by, resolution_note, resolved_at) VALUES
  (1, 'St. Joseph school principal demanded a formal MoU before allowing campus visit. Standard brochure approach not working.',
   'Schools in Poonamallee area are more formal and require institutional-level communication.',
   NULL, NULL, NULL),

  (2, 'One coaching centre (Rajam Tutorials) was hostile — said competitors are offering cash incentives to gatekeep leads.',
   'Competition is active in Trichy. May need a counter-offer or alternate approach.',
   1, 'Admin will draft a formal response strategy and share with field team by EOD tomorrow.',
   NOW() - INTERVAL '12 hours');


-- ------------------------------------------------------------
-- 9. FOLLOW-UP TASKS
--    Auto-generated from spoke_visit_entries where follow_up_role = 'telecaller'
-- ------------------------------------------------------------
INSERT INTO follow_up_tasks
  (source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
   action_description, follow_up_date, status) VALUES

  -- From visit entry 1 → assigned to Priya (telecaller id=2)
  (1, 'telecaller', 2,
   'St. Joseph Matric Hr Sec School',
   'Share brochures and schedule a student awareness session with Mr. Selvam',
   CURRENT_DATE + INTERVAL '2 days', 'pending'),

  -- From visit entry 3 → assigned to Arjun (telecaller id=3)
  (3, 'telecaller', 3,
   'Brilliant Tutorials Poonamallee',
   'Discuss tie-up model with Mr. Ramesh, share referral incentive plan',
   CURRENT_DATE + INTERVAL '1 day', 'pending'),

  -- From visit entry 5 → assigned to Sneha (telecaller id=4)
  (5, 'telecaller', 4,
   'Bishop Heber Hr Sec School',
   'Call back Ms. Anitha to confirm permission for campus awareness talk',
   CURRENT_DATE, 'pending');


-- ============================================================
-- VERIFY — quick row counts after insert
-- ============================================================
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