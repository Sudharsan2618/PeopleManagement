# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three confirmed roles, in priority order:

- **Admin** (primary user, design priority) — operations managers who oversee the
  whole funnel: import and assign leads, run WhatsApp campaigns, manage courses,
  telecallers and SPOCs, and read cross-team reports and dashboards. Desktop, in an
  office, working long sessions across large record sets.
- **Telecaller** — phone-sales agents who work the leads assigned to them: call
  prospects, log call outcomes, send WhatsApp messages, and schedule callbacks and
  follow-ups. Desktop, high-volume repetitive task work.
- **SPOC** (field agent / "single point of contact") — field reps who visit schools
  and coaching centres, file daily field reports, log visits and branding/alumni/
  corporate activities, and raise escalations.

## Product Purpose

TATTI CRM is a lead-and-admissions management system for an **education / training**
business. It captures prospective students ("prospects"/leads) from multiple sources,
routes them to telecallers, drives outreach by phone and WhatsApp, tracks each lead
through the admissions pipeline, and gives admins the reporting to manage the team and
the field operation. Success = more leads converted to completed admissions, with
managers able to see and steer team performance.

## Positioning

An operational CRM purpose-built for education/training admissions in one tool, rather
than a generic sales CRM. What is distinctive to preserve: a combined **telecalling +
field (SPOC) operation** in a single system — inside-sales lead work and on-the-ground
school/coaching-centre field reporting share the same prospect records — plus native
WhatsApp outreach (campaigns and inbox) as a first-class channel alongside calling.

## Operating Context

- **Roles & shells:** three role-scoped app areas — `/admin`, `/telecaller`, `/spoc`
  (Next.js under `UI/app/`), on a shared FastAPI + PostgreSQL backend.
- **Admin workflows:** dashboard, prospects, lead assignment (`assign`/`assignments`),
  WhatsApp, courses, telecallers, SPOCs, hubs, followups, reports, field-reports,
  spoc-reports, users.
- **Telecaller workflows:** dashboard, followups, callbacks, call history, messages,
  bulk-message.
- **SPOC workflows:** dashboard, prospects, followups, reports, telecallers.
- **Lead lifecycle:** prospects move through a rich status pipeline (new, contacted,
  warm, hot, visit_scheduled, visit_done, admission_done, cold/lost variants, plus
  B2B-style stages such as Interested, Proposal Sent, Qualified, etc.). Leads can be
  imported from lead sheets (`is_imported`, `lead_id`) or created directly.
- **Data scale:** large prospect datasets; assignment and reporting screens are built
  for server-side pagination, filtering, and bulk actions.
- **Environment note:** the local backend `.env` points at the **live production
  Postgres** — local writes and migrations hit production. Treat schema/data changes
  with production caution.

## Capabilities and Constraints

- **Confirmed capabilities:** user/role management; course management; prospect
  (lead) CRUD with pipeline status, multiple phones/emails, tags, lead source/type,
  course interest, follow-up dates; daily lead-to-telecaller assignment; call logging
  with outcomes and pending callbacks; auto-generated follow-up tasks (with overdue
  tracking); SPOC daily field reports, visit entries, activities, and escalations;
  WhatsApp messaging — campaigns/bulk send and a webhook-sourced inbox; dashboards and
  reports; XLSX/PDF export.
- **Terminology:** *prospect* = lead; *SPOC* = field agent; *telecaller* = inside-sales
  caller; *hub* = (org grouping used in admin); *admission* = the conversion goal.
- **Stack constraints:** frontend is **Next.js 16 + React 19 + Tailwind 4 + shadcn/
  Radix + lucide-react + recharts** under `UI/`. (Note: AGENTS.md/DESIGN.md describe a
  `frontend/` Vite app — that path is stale; the real app is `UI/`.) Backend is
  FastAPI + psycopg2 + PostgreSQL.
- **WhatsApp inbox constraint:** the inbox is populated from webhooks only — there is
  no Cloud API history backfill; click-to-WhatsApp ad leads are captured via referral
  payload.

## Brand Commitments

- **Name:** **TATTI CRM** (formerly "Course Enrollment Management System"). "TeamOne"
  in DESIGN.md/AGENTS.md is a design-doc label, not the product brand.
- **Voice:** plain, operational, neutral — labels are nouns, CTAs are verb-led and
  concise (per DESIGN.md content style). No marketing tone inside the app.
- Visual world is documented separately in DESIGN.md (a calm, dense, data-first
  enterprise system) and is not restated here.

## Evidence on Hand

- **Real backend + schema:** FastAPI routes and Pydantic schemas in `backend/`,
  full SQL dump `PeopleMangement.sql`, and a running production database.
- **Real app:** role-scoped Next.js UI in `UI/app/` (admin/telecaller/spoc).
- **No fabricated proof:** no testimonials, customer logos, benchmarks, pricing, or
  case studies are established — future work must not invent them. The specific
  education/training company's identity, logo, and any published metrics are not
  recorded here; do not fabricate them.

## Product Principles

1. **Admin is the center of gravity.** The operations manager oversees the whole funnel
   and the field team — prioritize their overview, assignment, and reporting surfaces.
2. **Data is the hero, at scale.** Screens routinely handle large lead sets; favor
   dense, server-paginated, filterable, bulk-actionable views over decorative layouts.
3. **One pipeline, two operations.** Telecalling and field (SPOC) work share the same
   prospect records; keep lead state consistent and legible across both.
4. **WhatsApp and calling are first-class channels**, not add-ons — outreach lives
   inside the lead workflow.
5. **Operational clarity over expression.** Status, ownership, and next action must be
   obvious at a glance; color signals meaning, never decoration.

## Accessibility & Inclusion

No product-specific accessibility standard has been established. Default to the
data-first enterprise baseline: legible dense typography, sufficient contrast on status
color, and full keyboard operability of tables, filters, and forms.
