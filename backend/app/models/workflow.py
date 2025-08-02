from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    natural_language_prompt = Column(Text, nullable=False)
    ai_interpreted_steps = Column(JSON)  # AI breakdown of the workflow
    status = Column(String(50), default="draft")  # draft, active, paused, archived
    is_active = Column(Boolean, default=True)
    
    # Browser configuration
    browser_type = Column(String(50), default="chrome")  # chrome, firefox, safari
    headless = Column(Boolean, default=True)
    timeout = Column(Integer, default=30000)
    
    # Execution settings
    max_retries = Column(Integer, default=3)
    retry_delay = Column(Integer, default=60)  # seconds
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    schedules = relationship("Schedule", back_populates="workflow")
    executions = relationship("Execution", back_populates="workflow")
    triggers = relationship("Trigger", back_populates="workflow")


class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    
    # Schedule configuration
    schedule_type = Column(String(50), nullable=False)  # cron, interval, one_time
    cron_expression = Column(String(100))  # For cron schedules
    interval_seconds = Column(Integer)  # For interval schedules
    start_time = Column(DateTime(timezone=True))  # For one-time schedules
    end_time = Column(DateTime(timezone=True))
    
    # Timezone and recurrence
    timezone = Column(String(50), default="UTC")
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="schedules")


class Trigger(Base):
    __tablename__ = "triggers"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    
    # Trigger configuration
    trigger_type = Column(String(50), nullable=False)  # visual, data, element
    trigger_condition = Column(JSON, nullable=False)  # Condition definition
    target_url = Column(String(500))  # URL to monitor
    check_interval = Column(Integer, default=300)  # seconds
    
    # Visual trigger specific
    screenshot_selector = Column(String(500))  # CSS selector for screenshot area
    visual_threshold = Column(Float)  # Similarity threshold
    
    # Data trigger specific
    data_field = Column(String(100))  # Field to monitor
    data_operator = Column(String(20))  # >, <, ==, !=, contains
    data_value = Column(String(500))  # Value to compare against
    
    # Element trigger specific
    element_selector = Column(String(500))  # CSS selector
    element_condition = Column(String(50))  # exists, not_exists, visible, hidden
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="triggers")


class Execution(Base):
    __tablename__ = "executions"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id"))
    trigger_id = Column(Integer, ForeignKey("triggers.id"))
    
    # Execution details
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration = Column(Integer)  # seconds
    
    # Results
    result_data = Column(JSON)  # Execution results
    error_message = Column(Text)
    screenshots = Column(JSON)  # Array of screenshot paths
    
    # Performance metrics
    steps_completed = Column(Integer, default=0)
    total_steps = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
    schedule = relationship("Schedule")
    trigger = relationship("Trigger")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())