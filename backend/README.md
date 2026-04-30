# Course Enrollment Management System - Backend API

FastAPI-based backend for the Course Enrollment Management System (CEMS) with PostgreSQL database.

## Project Structure

```
backend/
├── main.py                          # FastAPI application entry point
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variables template
├── database/
│   ├── __init__.py
│   └── connection.py               # PostgreSQL connection with psycopg2
├── models/
│   ├── __init__.py
│   └── schemas.py                  # Pydantic models for all tables
├── services/                        # Business logic with direct SQL queries
│   ├── __init__.py
│   ├── user_service.py
│   ├── prospect_service.py
│   ├── assignment_service.py
│   ├── call_log_service.py
│   ├── spoke_report_service.py
│   ├── spoke_visit_service.py
│   ├── spoke_activity_service.py
│   ├── spoke_escalation_service.py
│   └── followup_task_service.py
└── routes/                          # API endpoints
    ├── __init__.py
    ├── user_routes.py
    ├── prospect_routes.py
    ├── assignment_routes.py
    ├── call_log_routes.py
    ├── spoke_report_routes.py
    ├── spoke_visit_routes.py
    ├── spoke_activity_routes.py
    ├── spoke_escalation_routes.py
    └── followup_task_routes.py
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Database**
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env`:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

3. **Run Database Setup**
   - Execute the SQL schema from `../DB.sql` in your PostgreSQL database

4. **Start the Server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Access API Documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Users (`/users`)
- `GET /users` - Get all users
- `GET /users/{user_id}` - Get user by ID
- `GET /users/email/{email}` - Get user by email
- `GET /users/role/{role}` - Get users by role
- `POST /users` - Create new user
- `PUT /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user

### Prospects (`/prospects`)
- `GET /prospects` - Get all prospects
- `GET /prospects/{prospect_id}` - Get prospect by ID
- `GET /prospects/status/{status}` - Get prospects by status
- `GET /prospects/creator/{created_by}` - Get prospects by creator
- `POST /prospects` - Create new prospect
- `PUT /prospects/{prospect_id}` - Update prospect
- `DELETE /prospects/{prospect_id}` - Delete prospect

### Prospect Assignments (`/assignments`)
- `GET /assignments` - Get all assignments
- `GET /assignments/{assignment_id}` - Get assignment by ID
- `GET /assignments/telecaller/{telecaller_id}` - Get assignments by telecaller
- `GET /assignments/prospect/{prospect_id}` - Get assignments by prospect
- `POST /assignments` - Create new assignment
- `DELETE /assignments/{assignment_id}` - Delete assignment

### Call Logs (`/call-logs`)
- `GET /call-logs` - Get all call logs
- `GET /call-logs/{log_id}` - Get call log by ID
- `GET /call-logs/prospect/{prospect_id}` - Get call logs by prospect
- `GET /call-logs/telecaller/{telecaller_id}` - Get call logs by telecaller
- `GET /call-logs/callbacks/pending` - Get pending callbacks
- `POST /call-logs` - Create new call log
- `PUT /call-logs/{log_id}` - Update call log
- `DELETE /call-logs/{log_id}` - Delete call log

### Spoke Reports (`/spoke-reports`)
- `GET /spoke-reports` - Get all reports
- `GET /spoke-reports/{report_id}` - Get report by ID
- `GET /spoke-reports/spoke/{spoke_id}` - Get reports by spoke agent
- `GET /spoke-reports/draft` - Get draft reports
- `POST /spoke-reports` - Create new report
- `PUT /spoke-reports/{report_id}` - Update report
- `DELETE /spoke-reports/{report_id}` - Delete report

### Spoke Visits (`/spoke-visits`)
- `GET /spoke-visits` - Get all visit entries
- `GET /spoke-visits/{visit_id}` - Get visit by ID
- `GET /spoke-visits/report/{report_id}` - Get visits by report
- `POST /spoke-visits` - Create new visit entry
- `PUT /spoke-visits/{visit_id}` - Update visit entry
- `DELETE /spoke-visits/{visit_id}` - Delete visit entry

### Spoke Activities (`/spoke-activities`)
- `GET /spoke-activities` - Get all activities
- `GET /spoke-activities/{activity_id}` - Get activity by ID
- `GET /spoke-activities/report/{report_id}` - Get activities by report
- `POST /spoke-activities` - Create new activity
- `PUT /spoke-activities/{activity_id}` - Update activity
- `DELETE /spoke-activities/{activity_id}` - Delete activity

### Spoke Escalations (`/spoke-escalations`)
- `GET /spoke-escalations` - Get all escalations
- `GET /spoke-escalations/{escalation_id}` - Get escalation by ID
- `GET /spoke-escalations/report/{report_id}` - Get escalations by report
- `GET /spoke-escalations/unresolved` - Get unresolved escalations
- `POST /spoke-escalations` - Create new escalation
- `PUT /spoke-escalations/{escalation_id}` - Update escalation
- `DELETE /spoke-escalations/{escalation_id}` - Delete escalation

### Follow-up Tasks (`/followup-tasks`)
- `GET /followup-tasks` - Get all tasks
- `GET /followup-tasks/{task_id}` - Get task by ID
- `GET /followup-tasks/user/{user_id}` - Get tasks by user
- `GET /followup-tasks/role/{role}` - Get tasks by role
- `GET /followup-tasks/overdue` - Get overdue tasks
- `POST /followup-tasks` - Create new task
- `PUT /followup-tasks/{task_id}` - Update task
- `DELETE /followup-tasks/{task_id}` - Delete task

## Architecture

- **Routes**: API endpoints that handle HTTP requests/responses
- **Services**: Business logic layer with direct SQL queries using psycopg2
- **Models**: Pydantic schemas for request/response validation
- **Database**: PostgreSQL connection management with context managers

## Database Tables

1. `users` - Admin, telecaller, and spoke agent accounts
2. `prospects` - Student lead management
3. `prospect_assignments` - Daily prospect-to-telecaller assignments
4. `call_logs` - Telecaller call history and outcomes
5. `spoke_reports` - Spoke agent daily field reports
6. `spoke_visit_entries` - School/coaching centre visits
7. `spoke_activities` - Branding, alumni, corporate activities
8. `spoke_escalations` - Issues and challenges
9. `follow_up_tasks` - Auto-generated follow-up tasks

## Technology Stack

- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server
- **psycopg2**: PostgreSQL database adapter
- **Pydantic**: Data validation using Python type annotations
