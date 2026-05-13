-- ============================================================
-- COURSE ENROLLMENT MANAGEMENT SYSTEM (CEMS)
-- PostgreSQL Schema
-- ============================================================


-- ------------------------------------------------------------
-- 1. USERS
--    Single table for all roles: admin, telecaller, spoke
-- ------------------------------------------------------------
CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150)        NOT NULL,
    email            VARCHAR(255)        NOT NULL UNIQUE,
    mobile           VARCHAR(20)         NOT NULL UNIQUE,
    password         VARCHAR(255)        NOT NULL,
    role             VARCHAR(20)         NOT NULL,   -- 'admin' | 'telecaller' | 'spoke'
    is_active        BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 2. PROSPECTS
--    Master list of all student leads
-- ------------------------------------------------------------
CREATE TABLE prospects (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150)        NOT NULL,
    mobile           VARCHAR(20)         NOT NULL UNIQUE,
    email            VARCHAR(255),
    location         VARCHAR(150),
    sourced_from     VARCHAR(100),       -- e.g. 'school_visit', 'referral', 'walk_in'
    status           VARCHAR(50)         NOT NULL DEFAULT 'new',
                                         -- 'new' | 'contacted' | 'warm' | 'hot'
                                         -- 'visit_scheduled' | 'visit_done' | 'admission_done'
                                         -- 'cold_no_response' | 'cold_not_interested' | 'lost'
    course_interest  VARCHAR(100),
    created_by       INT                 REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 3. PROSPECT ASSIGNMENTS
--    Daily transactional table — who calls which prospect on which date
-- ------------------------------------------------------------
CREATE TABLE prospect_assignments (
    id               SERIAL PRIMARY KEY,
    prospect_id      INT                 NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    telecaller_id    INT                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by      INT                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_date    DATE                NOT NULL,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW(),

    UNIQUE (prospect_id, assigned_date)  -- one assignment per prospect per day
);


-- ------------------------------------------------------------
-- 4. CALL LOGS
--    Every call attempt a telecaller makes against a prospect
-- ------------------------------------------------------------
CREATE TABLE call_logs (
    id                      SERIAL PRIMARY KEY,
    prospect_id             INT             NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    telecaller_id           INT             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignment_id           INT             REFERENCES prospect_assignments(id) ON DELETE SET NULL,
    outcome                 VARCHAR(50)     NOT NULL,
                                            -- 'not_answered' | 'busy' | 'wrong_number'
                                            -- 'callback' | 'not_interested' | 'dnc'
                                            -- 'language_barrier' | 'interested' | 'qualified'
                                            -- 'enrolled_elsewhere'
    status_after_call       VARCHAR(50),    -- mirrors prospect pipeline stage after this call
    reason                  VARCHAR(255),   -- reason for not_interested / dnc etc.
    notes                   TEXT,
    course_interest         VARCHAR(100),   -- captured or updated during call
    callback_scheduled_at   TIMESTAMP,      -- filled when outcome = 'callback'
    called_at               TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 5. SPOKE DAILY REPORTS
--    Header record for each spoke agent's daily field report
-- ------------------------------------------------------------
CREATE TABLE spoke_reports (
    id               SERIAL PRIMARY KEY,
    spoke_id         INT                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    report_date      DATE                NOT NULL,
    area_location    VARCHAR(200)        NOT NULL,
    is_draft         BOOLEAN             NOT NULL DEFAULT TRUE,
    submitted_at     TIMESTAMP,                      -- NULL while draft
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW(),

    UNIQUE (spoke_id, report_date)       -- one report per spoke per day
);


-- ------------------------------------------------------------
-- 6. SPOKE VISIT ENTRIES
--    School / coaching centre / admission partner visits within a report
-- ------------------------------------------------------------
CREATE TABLE spoke_visit_entries (
    id                   SERIAL PRIMARY KEY,
    report_id            INT             NOT NULL REFERENCES spoke_reports(id) ON DELETE CASCADE,
    visit_type           VARCHAR(50)     NOT NULL,   -- 'school' | 'coaching_centre' | 'admission_partner'
    institution_name     VARCHAR(200)    NOT NULL,
    contact_name         VARCHAR(150),
    contact_email        VARCHAR(255),
    contact_mobile       VARCHAR(20),
    next_action          TEXT,
    follow_up_role       VARCHAR(20),    -- 'telecaller' | 'self'
    follow_up_user_id    INT             REFERENCES users(id) ON DELETE SET NULL,
    follow_up_date       DATE,
    created_at           TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 7. SPOKE ACTIVITIES
--    Branding, alumni, corporate, referral activities within a report
-- ------------------------------------------------------------
CREATE TABLE spoke_activities (
    id               SERIAL PRIMARY KEY,
    report_id        INT                 NOT NULL REFERENCES spoke_reports(id) ON DELETE CASCADE,
    activity_type    VARCHAR(50)         NOT NULL,   -- 'branding' | 'alumni' | 'corporate' | 'referral'
    done             BOOLEAN             NOT NULL DEFAULT FALSE,
    notes            TEXT,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 8. SPOKE ESCALATIONS
--    Issues / challenges raised inside a daily report
-- ------------------------------------------------------------
CREATE TABLE spoke_escalations (
    id               SERIAL PRIMARY KEY,
    report_id        INT                 NOT NULL REFERENCES spoke_reports(id) ON DELETE CASCADE,
    description      TEXT                NOT NULL,
    observations     TEXT,
    resolved_by      INT                 REFERENCES users(id) ON DELETE SET NULL,
    resolution_note  TEXT,
    resolved_at      TIMESTAMP,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 9. FOLLOW-UP TASKS
--    Auto-generated from spoke_visit_entries when follow_up_role is set
--    Also visible to telecallers as tasks in their queue
-- ------------------------------------------------------------
CREATE TABLE follow_up_tasks (
    id                      SERIAL PRIMARY KEY,
    source_entry_id         INT             REFERENCES spoke_visit_entries(id) ON DELETE SET NULL,
    assigned_to_role        VARCHAR(20)     NOT NULL,   -- 'telecaller' | 'spoke'
    assigned_to_user_id     INT             REFERENCES users(id) ON DELETE SET NULL,
    institution_name        VARCHAR(200),
    action_description      TEXT            NOT NULL,
    follow_up_date          DATE,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending',
                                            -- 'pending' | 'completed' | 'overdue'
    resolution_note         TEXT,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Prospects: frequent filters by status and assigned telecaller
CREATE INDEX idx_prospects_status        ON prospects(status);
CREATE INDEX idx_prospects_created_by    ON prospects(created_by);

-- Assignments: daily lookup by telecaller and date
CREATE INDEX idx_assignments_telecaller  ON prospect_assignments(telecaller_id, assigned_date);
CREATE INDEX idx_assignments_prospect    ON prospect_assignments(prospect_id);

-- Call logs: history lookup by prospect and telecaller
CREATE INDEX idx_call_logs_prospect      ON call_logs(prospect_id);
CREATE INDEX idx_call_logs_telecaller    ON call_logs(telecaller_id);
CREATE INDEX idx_call_logs_called_at     ON call_logs(called_at);
CREATE INDEX idx_call_logs_callback      ON call_logs(callback_scheduled_at)
    WHERE callback_scheduled_at IS NOT NULL;

-- Spoke reports: lookup by spoke and date
CREATE INDEX idx_spoke_reports_spoke     ON spoke_reports(spoke_id, report_date);

-- Spoke visit entries: lookup by report
CREATE INDEX idx_visit_entries_report    ON spoke_visit_entries(report_id);

-- Follow-up tasks: telecaller task queue lookup
CREATE INDEX idx_followup_user_status    ON follow_up_tasks(assigned_to_user_id, status);
CREATE INDEX idx_followup_date           ON follow_up_tasks(follow_up_date);

-- 10. COURSES
CREATE TABLE courses (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150)        NOT NULL,
    code             VARCHAR(50)         NOT NULL UNIQUE,
    description      TEXT,
    duration         VARCHAR(50),
    fees             NUMERIC(12, 2),
    is_active        BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);

-- 11. WHATSAPP CAMPAIGNS
CREATE TABLE whatsapp_campaigns (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150)        NOT NULL,
    template_name    VARCHAR(150)        NOT NULL,
    language_code    VARCHAR(10)         DEFAULT 'en_US',
    status           VARCHAR(50)         NOT NULL DEFAULT 'draft',
    total_recipients INT                 NOT NULL DEFAULT 0,
    sent_count       INT                 NOT NULL DEFAULT 0,
    delivered_count  INT                 NOT NULL DEFAULT 0,
    read_count       INT                 NOT NULL DEFAULT 0,
    created_by       INT                 REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);

-- 12. WHATSAPP MESSAGES
CREATE TABLE whatsapp_messages (
    id               SERIAL PRIMARY KEY,
    prospect_id      INT                 NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    campaign_id      INT                 REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
    meta_message_id  VARCHAR(255)        UNIQUE,
    direction        VARCHAR(10)         NOT NULL,
    message_type     VARCHAR(20)         NOT NULL,
    status           VARCHAR(20)         NOT NULL DEFAULT 'queued',
    body             TEXT,
    payload          JSONB,
    sent_at          TIMESTAMP,
    delivered_at     TIMESTAMP,
    read_at          TIMESTAMP,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_messages_prospect    ON whatsapp_messages(prospect_id);
CREATE INDEX idx_wa_messages_campaign    ON whatsapp_messages(campaign_id);
CREATE INDEX idx_wa_messages_status      ON whatsapp_messages(status);
CREATE INDEX idx_wa_messages_meta_id     ON whatsapp_messages(meta_message_id);