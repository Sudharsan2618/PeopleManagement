--
-- PostgreSQL database dump
--

\restrict S6a5hyiY4x1xnawPdt8rSuodIQaChtpZK6hGEWOSJhcR7A24nvdF7poKtUyEtt6

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
-- Dumped by pg_dump version 17.7

-- Started on 2026-05-22 11:36:21

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 39349)
-- Name: call_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.call_logs (
    id integer NOT NULL,
    prospect_id integer NOT NULL,
    telecaller_id integer NOT NULL,
    assignment_id integer,
    outcome character varying(50) NOT NULL,
    status_after_call character varying(50),
    reason character varying(255),
    notes text,
    course_interest character varying(100),
    callback_scheduled_at timestamp without time zone,
    called_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_logs OWNER TO admin;

--
-- TOC entry 221 (class 1259 OID 39348)
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.call_logs_id_seq OWNER TO admin;

--
-- TOC entry 3546 (class 0 OID 0)
-- Dependencies: 221
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- TOC entry 234 (class 1259 OID 39479)
-- Name: courses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    duration character varying(50),
    fees numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.courses OWNER TO admin;

--
-- TOC entry 233 (class 1259 OID 39478)
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO admin;

--
-- TOC entry 3547 (class 0 OID 0)
-- Dependencies: 233
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- TOC entry 232 (class 1259 OID 39446)
-- Name: follow_up_tasks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.follow_up_tasks (
    id integer NOT NULL,
    source_entry_id integer,
    assigned_to_role character varying(20) NOT NULL,
    assigned_to_user_id integer,
    institution_name character varying(200),
    action_description text NOT NULL,
    follow_up_date date,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    resolution_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.follow_up_tasks OWNER TO admin;

--
-- TOC entry 231 (class 1259 OID 39445)
-- Name: follow_up_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.follow_up_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.follow_up_tasks_id_seq OWNER TO admin;

--
-- TOC entry 3548 (class 0 OID 0)
-- Dependencies: 231
-- Name: follow_up_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.follow_up_tasks_id_seq OWNED BY public.follow_up_tasks.id;


--
-- TOC entry 220 (class 1259 OID 39324)
-- Name: prospect_assignments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.prospect_assignments (
    id integer NOT NULL,
    prospect_id integer NOT NULL,
    telecaller_id integer NOT NULL,
    assigned_by integer NOT NULL,
    assigned_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.prospect_assignments OWNER TO admin;

--
-- TOC entry 219 (class 1259 OID 39323)
-- Name: prospect_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.prospect_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prospect_assignments_id_seq OWNER TO admin;

--
-- TOC entry 3549 (class 0 OID 0)
-- Dependencies: 219
-- Name: prospect_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.prospect_assignments_id_seq OWNED BY public.prospect_assignments.id;


--
-- TOC entry 218 (class 1259 OID 39305)
-- Name: prospects; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.prospects (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    mobile character varying(20) NOT NULL,
    email character varying(255),
    location character varying(150),
    sourced_from character varying(100),
    status character varying(50) DEFAULT 'new'::character varying NOT NULL,
    course_interest character varying(100),
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    parent_name character varying(150),
    department character varying(150),
    assigned_to integer,
    closing_reason character varying(255),
    tags jsonb,
    city character varying(150),
    qualification character varying(150),
    current_status character varying(100),
    degree character varying(150),
    lead_source jsonb DEFAULT '[]'::jsonb,
    lead_type jsonb DEFAULT '[]'::jsonb,
    outcome character varying(100) DEFAULT 'New'::character varying
);


ALTER TABLE public.prospects OWNER TO admin;

--
-- TOC entry 217 (class 1259 OID 39304)
-- Name: prospects_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.prospects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prospects_id_seq OWNER TO admin;

--
-- TOC entry 3550 (class 0 OID 0)
-- Dependencies: 217
-- Name: prospects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.prospects_id_seq OWNED BY public.prospects.id;


--
-- TOC entry 228 (class 1259 OID 39410)
-- Name: spoc_activities; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.spoc_activities (
    id integer NOT NULL,
    report_id integer NOT NULL,
    activity_type character varying(50) NOT NULL,
    done boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.spoc_activities OWNER TO admin;

--
-- TOC entry 230 (class 1259 OID 39426)
-- Name: spoc_escalations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.spoc_escalations (
    id integer NOT NULL,
    report_id integer NOT NULL,
    description text NOT NULL,
    observations text,
    resolved_by integer,
    resolution_note text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.spoc_escalations OWNER TO admin;

--
-- TOC entry 224 (class 1259 OID 39374)
-- Name: spoc_reports; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.spoc_reports (
    id integer NOT NULL,
    spoc_id integer NOT NULL,
    report_date date NOT NULL,
    area_location character varying(200) NOT NULL,
    is_draft boolean DEFAULT true NOT NULL,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.spoc_reports OWNER TO admin;

--
-- TOC entry 226 (class 1259 OID 39390)
-- Name: spoc_visit_entries; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.spoc_visit_entries (
    id integer NOT NULL,
    report_id integer NOT NULL,
    visit_type character varying(50) NOT NULL,
    institution_name character varying(200) NOT NULL,
    contact_name character varying(150),
    contact_email character varying(255),
    contact_mobile character varying(20),
    next_action text,
    follow_up_role character varying(20),
    follow_up_user_id integer,
    follow_up_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.spoc_visit_entries OWNER TO admin;

--
-- TOC entry 227 (class 1259 OID 39409)
-- Name: spoke_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.spoke_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spoke_activities_id_seq OWNER TO admin;

--
-- TOC entry 3551 (class 0 OID 0)
-- Dependencies: 227
-- Name: spoke_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.spoke_activities_id_seq OWNED BY public.spoc_activities.id;


--
-- TOC entry 229 (class 1259 OID 39425)
-- Name: spoke_escalations_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.spoke_escalations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spoke_escalations_id_seq OWNER TO admin;

--
-- TOC entry 3552 (class 0 OID 0)
-- Dependencies: 229
-- Name: spoke_escalations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.spoke_escalations_id_seq OWNED BY public.spoc_escalations.id;


--
-- TOC entry 223 (class 1259 OID 39373)
-- Name: spoke_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.spoke_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spoke_reports_id_seq OWNER TO admin;

--
-- TOC entry 3553 (class 0 OID 0)
-- Dependencies: 223
-- Name: spoke_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.spoke_reports_id_seq OWNED BY public.spoc_reports.id;


--
-- TOC entry 225 (class 1259 OID 39389)
-- Name: spoke_visit_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.spoke_visit_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spoke_visit_entries_id_seq OWNER TO admin;

--
-- TOC entry 3554 (class 0 OID 0)
-- Dependencies: 225
-- Name: spoke_visit_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.spoke_visit_entries_id_seq OWNED BY public.spoc_visit_entries.id;


--
-- TOC entry 216 (class 1259 OID 39290)
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    mobile character varying(20) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO admin;

--
-- TOC entry 215 (class 1259 OID 39289)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO admin;

--
-- TOC entry 3555 (class 0 OID 0)
-- Dependencies: 215
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 236 (class 1259 OID 39493)
-- Name: whatsapp_campaigns; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.whatsapp_campaigns (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    template_name character varying(150) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    total_recipients integer DEFAULT 0 NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    delivered_count integer DEFAULT 0 NOT NULL,
    read_count integer DEFAULT 0 NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    language_code character varying(10) DEFAULT 'en_US'::character varying,
    parameters jsonb,
    response_config jsonb
);


ALTER TABLE public.whatsapp_campaigns OWNER TO admin;

--
-- TOC entry 235 (class 1259 OID 39492)
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.whatsapp_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_campaigns_id_seq OWNER TO admin;

--
-- TOC entry 3556 (class 0 OID 0)
-- Dependencies: 235
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.whatsapp_campaigns_id_seq OWNED BY public.whatsapp_campaigns.id;


--
-- TOC entry 240 (class 1259 OID 39547)
-- Name: whatsapp_flow_submissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.whatsapp_flow_submissions (
    id integer NOT NULL,
    prospect_id integer,
    wa_message_id character varying(255),
    wa_phone character varying(20) NOT NULL,
    flow_token character varying(255),
    full_name character varying(150),
    email character varying(255),
    city character varying(150),
    qualification character varying(150),
    current_status character varying(100),
    degree character varying(150),
    submission_status character varying(50) DEFAULT 'completed'::character varying,
    raw_payload jsonb,
    received_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_flow_submissions OWNER TO admin;

--
-- TOC entry 239 (class 1259 OID 39546)
-- Name: whatsapp_flow_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.whatsapp_flow_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_flow_submissions_id_seq OWNER TO admin;

--
-- TOC entry 3557 (class 0 OID 0)
-- Dependencies: 239
-- Name: whatsapp_flow_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.whatsapp_flow_submissions_id_seq OWNED BY public.whatsapp_flow_submissions.id;


--
-- TOC entry 242 (class 1259 OID 39568)
-- Name: whatsapp_media_assets; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.whatsapp_media_assets (
    id integer NOT NULL,
    nickname character varying(100) NOT NULL,
    media_id character varying(255) NOT NULL,
    file_type character varying(50),
    file_name character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_media_assets OWNER TO admin;

--
-- Name: whatsapp_quick_send_templates; Type: TABLE; Schema: public; Owner: admin
-- Curated, caller-safe templates surfaced in the telecaller send drawer when the
-- 24-hour customer-service window is closed. variable_mapping resolves body/header
-- placeholders from prospect fields server-side (same format as campaign params).
--

CREATE TABLE public.whatsapp_quick_send_templates (
    id integer NOT NULL,
    template_name character varying(150) NOT NULL,
    language_code character varying(20) DEFAULT 'en_US'::character varying NOT NULL,
    label character varying(150) NOT NULL,
    description text,
    variable_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.whatsapp_quick_send_templates OWNER TO admin;

CREATE SEQUENCE public.whatsapp_quick_send_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.whatsapp_quick_send_templates_id_seq OWNER TO admin;
ALTER SEQUENCE public.whatsapp_quick_send_templates_id_seq OWNED BY public.whatsapp_quick_send_templates.id;
ALTER TABLE ONLY public.whatsapp_quick_send_templates ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_quick_send_templates_id_seq'::regclass);
ALTER TABLE ONLY public.whatsapp_quick_send_templates ADD CONSTRAINT whatsapp_quick_send_templates_pkey PRIMARY KEY (id);

--
-- TOC entry 241 (class 1259 OID 39567)
-- Name: whatsapp_media_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.whatsapp_media_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_media_assets_id_seq OWNER TO admin;

--
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 241
-- Name: whatsapp_media_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.whatsapp_media_assets_id_seq OWNED BY public.whatsapp_media_assets.id;


--
-- TOC entry 238 (class 1259 OID 39511)
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.whatsapp_messages (
    id integer NOT NULL,
    prospect_id integer NOT NULL,
    campaign_id integer,
    meta_message_id character varying(255),
    direction character varying(10) NOT NULL,
    message_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    body text,
    payload jsonb,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    template_name character varying(150)
);


ALTER TABLE public.whatsapp_messages OWNER TO admin;

--
-- TOC entry 237 (class 1259 OID 39510)
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.whatsapp_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_messages_id_seq OWNER TO admin;

--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 237
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNED BY public.whatsapp_messages.id;


--
-- TOC entry 3277 (class 2604 OID 39352)
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- TOC entry 3292 (class 2604 OID 39482)
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- TOC entry 3289 (class 2604 OID 39449)
-- Name: follow_up_tasks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.follow_up_tasks ALTER COLUMN id SET DEFAULT nextval('public.follow_up_tasks_id_seq'::regclass);


--
-- TOC entry 3275 (class 2604 OID 39327)
-- Name: prospect_assignments id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospect_assignments ALTER COLUMN id SET DEFAULT nextval('public.prospect_assignments_id_seq'::regclass);


--
-- TOC entry 3271 (class 2604 OID 39308)
-- Name: prospects id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospects ALTER COLUMN id SET DEFAULT nextval('public.prospects_id_seq'::regclass);


--
-- TOC entry 3284 (class 2604 OID 39413)
-- Name: spoc_activities id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_activities ALTER COLUMN id SET DEFAULT nextval('public.spoke_activities_id_seq'::regclass);


--
-- TOC entry 3287 (class 2604 OID 39429)
-- Name: spoc_escalations id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_escalations ALTER COLUMN id SET DEFAULT nextval('public.spoke_escalations_id_seq'::regclass);


--
-- TOC entry 3279 (class 2604 OID 39377)
-- Name: spoc_reports id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_reports ALTER COLUMN id SET DEFAULT nextval('public.spoke_reports_id_seq'::regclass);


--
-- TOC entry 3282 (class 2604 OID 39393)
-- Name: spoc_visit_entries id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_visit_entries ALTER COLUMN id SET DEFAULT nextval('public.spoke_visit_entries_id_seq'::regclass);


--
-- TOC entry 3268 (class 2604 OID 39293)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3295 (class 2604 OID 39496)
-- Name: whatsapp_campaigns id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_campaigns ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_campaigns_id_seq'::regclass);


--
-- TOC entry 3306 (class 2604 OID 39550)
-- Name: whatsapp_flow_submissions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_flow_submissions ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_flow_submissions_id_seq'::regclass);


--
-- TOC entry 3310 (class 2604 OID 39571)
-- Name: whatsapp_media_assets id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_media_assets ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_media_assets_id_seq'::regclass);


--
-- TOC entry 3303 (class 2604 OID 39514)
-- Name: whatsapp_messages id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);


--
-- TOC entry 3332 (class 2606 OID 39357)
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3354 (class 2606 OID 39490)
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code);


--
-- TOC entry 3356 (class 2606 OID 39488)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 3350 (class 2606 OID 39455)
-- Name: follow_up_tasks follow_up_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.follow_up_tasks
    ADD CONSTRAINT follow_up_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3328 (class 2606 OID 39330)
-- Name: prospect_assignments prospect_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospect_assignments
    ADD CONSTRAINT prospect_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3330 (class 2606 OID 39332)
-- Name: prospect_assignments prospect_assignments_prospect_id_assigned_date_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospect_assignments
    ADD CONSTRAINT prospect_assignments_prospect_id_assigned_date_key UNIQUE (prospect_id, assigned_date);


--
-- TOC entry 3322 (class 2606 OID 39317)
-- Name: prospects prospects_mobile_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_mobile_key UNIQUE (mobile);


--
-- TOC entry 3324 (class 2606 OID 39315)
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (id);


--
-- TOC entry 3346 (class 2606 OID 39419)
-- Name: spoc_activities spoke_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_activities
    ADD CONSTRAINT spoke_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 3348 (class 2606 OID 39434)
-- Name: spoc_escalations spoke_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_escalations
    ADD CONSTRAINT spoke_escalations_pkey PRIMARY KEY (id);


--
-- TOC entry 3339 (class 2606 OID 39381)
-- Name: spoc_reports spoke_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_reports
    ADD CONSTRAINT spoke_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3341 (class 2606 OID 39383)
-- Name: spoc_reports spoke_reports_spoke_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_reports
    ADD CONSTRAINT spoke_reports_spoke_id_report_date_key UNIQUE (spoc_id, report_date);


--
-- TOC entry 3344 (class 2606 OID 39398)
-- Name: spoc_visit_entries spoke_visit_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_visit_entries
    ADD CONSTRAINT spoke_visit_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 3313 (class 2606 OID 39301)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3315 (class 2606 OID 39303)
-- Name: users users_mobile_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_mobile_key UNIQUE (mobile);


--
-- TOC entry 3317 (class 2606 OID 39299)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3358 (class 2606 OID 39504)
-- Name: whatsapp_campaigns whatsapp_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 3370 (class 2606 OID 39557)
-- Name: whatsapp_flow_submissions whatsapp_flow_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_flow_submissions
    ADD CONSTRAINT whatsapp_flow_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3372 (class 2606 OID 39559)
-- Name: whatsapp_flow_submissions whatsapp_flow_submissions_wa_message_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_flow_submissions
    ADD CONSTRAINT whatsapp_flow_submissions_wa_message_id_key UNIQUE (wa_message_id);


--
-- TOC entry 3375 (class 2606 OID 39578)
-- Name: whatsapp_media_assets whatsapp_media_assets_nickname_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_media_assets
    ADD CONSTRAINT whatsapp_media_assets_nickname_key UNIQUE (nickname);


--
-- TOC entry 3377 (class 2606 OID 39576)
-- Name: whatsapp_media_assets whatsapp_media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_media_assets
    ADD CONSTRAINT whatsapp_media_assets_pkey PRIMARY KEY (id);


--
-- TOC entry 3364 (class 2606 OID 39522)
-- Name: whatsapp_messages whatsapp_messages_meta_message_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_meta_message_id_key UNIQUE (meta_message_id);


--
-- TOC entry 3366 (class 2606 OID 39520)
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 3325 (class 1259 OID 39469)
-- Name: idx_assignments_prospect; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_assignments_prospect ON public.prospect_assignments USING btree (prospect_id);


--
-- TOC entry 3326 (class 1259 OID 39468)
-- Name: idx_assignments_telecaller; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_assignments_telecaller ON public.prospect_assignments USING btree (telecaller_id, assigned_date);


--
-- TOC entry 3333 (class 1259 OID 39473)
-- Name: idx_call_logs_callback; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_call_logs_callback ON public.call_logs USING btree (callback_scheduled_at) WHERE (callback_scheduled_at IS NOT NULL);


--
-- TOC entry 3334 (class 1259 OID 39472)
-- Name: idx_call_logs_called_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_call_logs_called_at ON public.call_logs USING btree (called_at);


--
-- TOC entry 3335 (class 1259 OID 39470)
-- Name: idx_call_logs_prospect; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_call_logs_prospect ON public.call_logs USING btree (prospect_id);


--
-- TOC entry 3336 (class 1259 OID 39471)
-- Name: idx_call_logs_telecaller; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_call_logs_telecaller ON public.call_logs USING btree (telecaller_id);


--
-- TOC entry 3367 (class 1259 OID 39565)
-- Name: idx_flow_submissions_phone; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_flow_submissions_phone ON public.whatsapp_flow_submissions USING btree (wa_phone);


--
-- TOC entry 3368 (class 1259 OID 39566)
-- Name: idx_flow_submissions_token; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_flow_submissions_token ON public.whatsapp_flow_submissions USING btree (flow_token);


--
-- TOC entry 3351 (class 1259 OID 39477)
-- Name: idx_followup_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_followup_date ON public.follow_up_tasks USING btree (follow_up_date);


--
-- TOC entry 3352 (class 1259 OID 39476)
-- Name: idx_followup_user_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_followup_user_status ON public.follow_up_tasks USING btree (assigned_to_user_id, status);


--
-- TOC entry 3318 (class 1259 OID 39543)
-- Name: idx_prospects_assigned_to; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_prospects_assigned_to ON public.prospects USING btree (assigned_to);


--
-- TOC entry 3319 (class 1259 OID 39467)
-- Name: idx_prospects_created_by; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_prospects_created_by ON public.prospects USING btree (created_by);


--
-- TOC entry 3320 (class 1259 OID 39466)
-- Name: idx_prospects_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_prospects_status ON public.prospects USING btree (status);


--
-- TOC entry 3337 (class 1259 OID 39474)
-- Name: idx_spoke_reports_spoke; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_spoke_reports_spoke ON public.spoc_reports USING btree (spoc_id, report_date);


--
-- TOC entry 3342 (class 1259 OID 39475)
-- Name: idx_visit_entries_report; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_visit_entries_report ON public.spoc_visit_entries USING btree (report_id);


--
-- TOC entry 3373 (class 1259 OID 39579)
-- Name: idx_wa_media_nickname; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_wa_media_nickname ON public.whatsapp_media_assets USING btree (nickname);


--
-- TOC entry 3359 (class 1259 OID 39534)
-- Name: idx_wa_messages_campaign; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_wa_messages_campaign ON public.whatsapp_messages USING btree (campaign_id);


--
-- TOC entry 3360 (class 1259 OID 39536)
-- Name: idx_wa_messages_meta_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_wa_messages_meta_id ON public.whatsapp_messages USING btree (meta_message_id);


--
-- TOC entry 3361 (class 1259 OID 39533)
-- Name: idx_wa_messages_prospect; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_wa_messages_prospect ON public.whatsapp_messages USING btree (prospect_id);


--
-- TOC entry 3362 (class 1259 OID 39535)
-- Name: idx_wa_messages_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_wa_messages_status ON public.whatsapp_messages USING btree (status);


--
-- TOC entry 3383 (class 2606 OID 39368)
-- Name: call_logs call_logs_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.prospect_assignments(id) ON DELETE SET NULL;


--
-- TOC entry 3384 (class 2606 OID 39358)
-- Name: call_logs call_logs_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


--
-- TOC entry 3385 (class 2606 OID 39363)
-- Name: call_logs call_logs_telecaller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_telecaller_id_fkey FOREIGN KEY (telecaller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 3392 (class 2606 OID 39461)
-- Name: follow_up_tasks follow_up_tasks_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.follow_up_tasks
    ADD CONSTRAINT follow_up_tasks_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3393 (class 2606 OID 39456)
-- Name: follow_up_tasks follow_up_tasks_source_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.follow_up_tasks
    ADD CONSTRAINT follow_up_tasks_source_entry_id_fkey FOREIGN KEY (source_entry_id) REFERENCES public.spoc_visit_entries(id) ON DELETE SET NULL;


--
-- TOC entry 3380 (class 2606 OID 39343)
-- Name: prospect_assignments prospect_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospect_assignments
    ADD CONSTRAINT prospect_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 3381 (class 2606 OID 39333)
-- Name: prospect_assignments prospect_assignments_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospect_assignments
    ADD CONSTRAINT prospect_assignments_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


--
-- TOC entry 3382 (class 2606 OID 39338)
-- Name: prospect_assignments prospect_assignments_telecaller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospect_assignments
    ADD CONSTRAINT prospect_assignments_telecaller_id_fkey FOREIGN KEY (telecaller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 3378 (class 2606 OID 39538)
-- Name: prospects prospects_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3379 (class 2606 OID 39318)
-- Name: prospects prospects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3389 (class 2606 OID 39420)
-- Name: spoc_activities spoke_activities_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_activities
    ADD CONSTRAINT spoke_activities_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.spoc_reports(id) ON DELETE CASCADE;


--
-- TOC entry 3390 (class 2606 OID 39435)
-- Name: spoc_escalations spoke_escalations_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_escalations
    ADD CONSTRAINT spoke_escalations_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.spoc_reports(id) ON DELETE CASCADE;


--
-- TOC entry 3391 (class 2606 OID 39440)
-- Name: spoc_escalations spoke_escalations_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_escalations
    ADD CONSTRAINT spoke_escalations_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3386 (class 2606 OID 39384)
-- Name: spoc_reports spoke_reports_spoke_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_reports
    ADD CONSTRAINT spoke_reports_spoke_id_fkey FOREIGN KEY (spoc_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 3387 (class 2606 OID 39404)
-- Name: spoc_visit_entries spoke_visit_entries_follow_up_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_visit_entries
    ADD CONSTRAINT spoke_visit_entries_follow_up_user_id_fkey FOREIGN KEY (follow_up_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3388 (class 2606 OID 39399)
-- Name: spoc_visit_entries spoke_visit_entries_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spoc_visit_entries
    ADD CONSTRAINT spoke_visit_entries_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.spoc_reports(id) ON DELETE CASCADE;


--
-- TOC entry 3394 (class 2606 OID 39505)
-- Name: whatsapp_campaigns whatsapp_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3397 (class 2606 OID 39560)
-- Name: whatsapp_flow_submissions whatsapp_flow_submissions_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_flow_submissions
    ADD CONSTRAINT whatsapp_flow_submissions_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


--
-- TOC entry 3395 (class 2606 OID 39528)
-- Name: whatsapp_messages whatsapp_messages_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;


--
-- TOC entry 3396 (class 2606 OID 39523)
-- Name: whatsapp_messages whatsapp_messages_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


-- Completed on 2026-05-22 11:36:25

--
-- PostgreSQL database dump complete
--

\unrestrict S6a5hyiY4x1xnawPdt8rSuodIQaChtpZK6hGEWOSJhcR7A24nvdF7poKtUyEtt6

