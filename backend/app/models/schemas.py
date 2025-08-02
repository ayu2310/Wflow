from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class ScheduleType(str, Enum):
    CRON = "cron"
    INTERVAL = "interval"
    ONE_TIME = "one_time"


class TriggerType(str, Enum):
    VISUAL = "visual"
    DATA = "data"
    ELEMENT = "element"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# Base schemas
class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    natural_language_prompt: str = Field(..., min_length=10)
    browser_type: str = Field(default="chrome", regex="^(chrome|firefox|safari)$")
    headless: bool = True
    timeout: int = Field(default=30000, ge=1000, le=300000)
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_delay: int = Field(default=60, ge=0, le=3600)


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    natural_language_prompt: Optional[str] = Field(None, min_length=10)
    status: Optional[WorkflowStatus] = None
    browser_type: Optional[str] = Field(None, regex="^(chrome|firefox|safari)$")
    headless: Optional[bool] = None
    timeout: Optional[int] = Field(None, ge=1000, le=300000)
    max_retries: Optional[int] = Field(None, ge=0, le=10)
    retry_delay: Optional[int] = Field(None, ge=0, le=3600)


class WorkflowResponse(WorkflowBase):
    id: int
    status: WorkflowStatus
    is_active: bool
    ai_interpreted_steps: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    
    class Config:
        from_attributes = True


# Schedule schemas
class ScheduleBase(BaseModel):
    schedule_type: ScheduleType
    timezone: str = Field(default="UTC", max_length=50)
    is_active: bool = True


class CronSchedule(ScheduleBase):
    schedule_type: ScheduleType = ScheduleType.CRON
    cron_expression: str = Field(..., regex="^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$")


class IntervalSchedule(ScheduleBase):
    schedule_type: ScheduleType = ScheduleType.INTERVAL
    interval_seconds: int = Field(..., ge=60, le=31536000)  # 1 minute to 1 year


class OneTimeSchedule(ScheduleBase):
    schedule_type: ScheduleType = ScheduleType.ONE_TIME
    start_time: datetime


class ScheduleCreate(BaseModel):
    workflow_id: int
    schedule: CronSchedule | IntervalSchedule | OneTimeSchedule


class ScheduleResponse(BaseModel):
    id: int
    workflow_id: int
    schedule_type: ScheduleType
    cron_expression: Optional[str] = None
    interval_seconds: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    timezone: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Trigger schemas
class TriggerBase(BaseModel):
    trigger_type: TriggerType
    target_url: Optional[str] = Field(None, max_length=500)
    check_interval: int = Field(default=300, ge=30, le=3600)  # 30 seconds to 1 hour
    is_active: bool = True


class VisualTrigger(TriggerBase):
    trigger_type: TriggerType = TriggerType.VISUAL
    screenshot_selector: str = Field(..., max_length=500)
    visual_threshold: float = Field(..., ge=0.0, le=1.0)
    trigger_condition: Dict[str, Any] = Field(..., description="Visual change detection criteria")


class DataTrigger(TriggerBase):
    trigger_type: TriggerType = TriggerType.DATA
    data_field: str = Field(..., max_length=100)
    data_operator: str = Field(..., regex="^(>|<|==|!=|contains|not_contains)$")
    data_value: str = Field(..., max_length=500)
    trigger_condition: Dict[str, Any] = Field(..., description="Data comparison criteria")


class ElementTrigger(TriggerBase):
    trigger_type: TriggerType = TriggerType.ELEMENT
    element_selector: str = Field(..., max_length=500)
    element_condition: str = Field(..., regex="^(exists|not_exists|visible|hidden)$")
    trigger_condition: Dict[str, Any] = Field(..., description="Element state criteria")


class TriggerCreate(BaseModel):
    workflow_id: int
    trigger: VisualTrigger | DataTrigger | ElementTrigger


class TriggerResponse(BaseModel):
    id: int
    workflow_id: int
    trigger_type: TriggerType
    trigger_condition: Dict[str, Any]
    target_url: Optional[str] = None
    check_interval: int
    screenshot_selector: Optional[str] = None
    visual_threshold: Optional[float] = None
    data_field: Optional[str] = None
    data_operator: Optional[str] = None
    data_value: Optional[str] = None
    element_selector: Optional[str] = None
    element_condition: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Execution schemas
class ExecutionResponse(BaseModel):
    id: int
    workflow_id: int
    schedule_id: Optional[int] = None
    trigger_id: Optional[int] = None
    status: ExecutionStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[int] = None
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    screenshots: Optional[List[str]] = None
    steps_completed: int
    total_steps: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# User schemas
class UserBase(BaseModel):
    email: str = Field(..., regex="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    username: Optional[str] = Field(None, min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# AI Processing schemas
class WorkflowInterpretationRequest(BaseModel):
    natural_language_prompt: str = Field(..., min_length=10)
    context: Optional[Dict[str, Any]] = None


class WorkflowInterpretationResponse(BaseModel):
    interpreted_steps: List[Dict[str, Any]]
    confidence_score: float
    estimated_duration: int  # seconds
    potential_risks: List[str]
    recommendations: List[str]


# Dashboard schemas
class DashboardStats(BaseModel):
    total_workflows: int
    active_workflows: int
    total_executions: int
    successful_executions: int
    failed_executions: int
    average_execution_time: float
    success_rate: float


class WorkflowSummary(BaseModel):
    id: int
    name: str
    status: WorkflowStatus
    last_execution: Optional[datetime] = None
    success_rate: float
    average_duration: Optional[float] = None
    next_scheduled_run: Optional[datetime] = None