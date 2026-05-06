from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import (
    user_routes,
    prospect_routes,
    assignment_routes,
    call_log_routes,
    spoke_report_routes,
    spoke_visit_routes,
    spoke_activity_routes,
    spoke_escalation_routes,
    followup_task_routes
)

app = FastAPI(
    title="Course Enrollment Management System API",
    description="Backend API for Course Enrollment Management System (CEMS)",
    version="1.0.0",
    redirect_slashes=False
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(user_routes.router)
app.include_router(prospect_routes.router)
app.include_router(assignment_routes.router)
app.include_router(call_log_routes.router)
app.include_router(spoke_report_routes.router)
app.include_router(spoke_visit_routes.router)
app.include_router(spoke_activity_routes.router)
app.include_router(spoke_escalation_routes.router)
app.include_router(followup_task_routes.router)


@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "Course Enrollment Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
