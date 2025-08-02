from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import uvicorn

from app.core.config import settings
from app.core.database import engine, Base
from app.api import workflows, schedules, triggers, executions, users, ai
from app.services.browser_service import browser_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Wflow application...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Wflow application...")
    await browser_service.close_browser()


# Create FastAPI app
app = FastAPI(
    title="Wflow - Intelligent Browser Workflow Automation",
    description="AI-powered browser automation platform with natural language workflow creation",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for screenshots
app.mount("/screenshots", StaticFiles(directory="screenshots"), name="screenshots")

# Include API routers
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Processing"])
app.include_router(workflows.router, prefix="/api/v1/workflows", tags=["Workflows"])
app.include_router(schedules.router, prefix="/api/v1/schedules", tags=["Schedules"])
app.include_router(triggers.router, prefix="/api/v1/triggers", tags=["Triggers"])
app.include_router(executions.router, prefix="/api/v1/executions", tags=["Executions"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])


@app.get("/")
async def root():
    return {
        "message": "Wflow - Intelligent Browser Workflow Automation",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "ai_service": "available" if settings.gemini_api_key else "not_configured"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )