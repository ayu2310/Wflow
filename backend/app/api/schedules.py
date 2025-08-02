from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import logging

from app.core.database import get_db
from app.models.workflow import Schedule, Workflow
from app.models.schemas import (
    ScheduleCreate,
    ScheduleResponse,
    CronSchedule,
    IntervalSchedule,
    OneTimeSchedule
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ScheduleResponse)
async def create_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new schedule for a workflow
    """
    try:
        # Verify workflow exists
        workflow = db.query(Workflow).filter(Workflow.id == schedule_data.workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        schedule = schedule_data.schedule
        
        # Create schedule based on type
        if isinstance(schedule, CronSchedule):
            db_schedule = Schedule(
                workflow_id=schedule_data.workflow_id,
                schedule_type="cron",
                cron_expression=schedule.cron_expression,
                timezone=schedule.timezone,
                is_active=schedule.is_active
            )
        elif isinstance(schedule, IntervalSchedule):
            db_schedule = Schedule(
                workflow_id=schedule_data.workflow_id,
                schedule_type="interval",
                interval_seconds=schedule.interval_seconds,
                timezone=schedule.timezone,
                is_active=schedule.is_active
            )
        elif isinstance(schedule, OneTimeSchedule):
            db_schedule = Schedule(
                workflow_id=schedule_data.workflow_id,
                schedule_type="one_time",
                start_time=schedule.start_time,
                timezone=schedule.timezone,
                is_active=schedule.is_active
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid schedule type")
        
        db.add(db_schedule)
        db.commit()
        db.refresh(db_schedule)
        
        return ScheduleResponse.from_orm(db_schedule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create schedule: {str(e)}")


@router.get("/", response_model=List[ScheduleResponse])
async def list_schedules(
    workflow_id: int = None,
    db: Session = Depends(get_db)
):
    """
    List schedules with optional workflow filtering
    """
    try:
        query = db.query(Schedule)
        
        if workflow_id:
            query = query.filter(Schedule.workflow_id == workflow_id)
        
        schedules = query.all()
        return [ScheduleResponse.from_orm(schedule) for schedule in schedules]
        
    except Exception as e:
        logger.error(f"Error listing schedules: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list schedules: {str(e)}")


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific schedule by ID
    """
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        return ScheduleResponse.from_orm(schedule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get schedule: {str(e)}")


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_update: dict,
    db: Session = Depends(get_db)
):
    """
    Update a schedule
    """
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Update fields
        for field, value in schedule_update.items():
            if hasattr(schedule, field):
                setattr(schedule, field, value)
        
        db.commit()
        db.refresh(schedule)
        
        return ScheduleResponse.from_orm(schedule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update schedule: {str(e)}")


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a schedule
    """
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        db.delete(schedule)
        db.commit()
        
        return {"message": "Schedule deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete schedule: {str(e)}")


@router.post("/{schedule_id}/toggle")
async def toggle_schedule(
    schedule_id: int,
    db: Session = Depends(get_db)
):
    """
    Toggle schedule active status
    """
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        schedule.is_active = not schedule.is_active
        db.commit()
        
        return {
            "schedule_id": schedule_id,
            "is_active": schedule.is_active,
            "message": f"Schedule {'activated' if schedule.is_active else 'deactivated'}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle schedule: {str(e)}")