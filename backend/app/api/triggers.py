from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import logging

from app.core.database import get_db
from app.models.workflow import Trigger, Workflow
from app.models.schemas import (
    TriggerCreate,
    TriggerResponse,
    VisualTrigger,
    DataTrigger,
    ElementTrigger
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=TriggerResponse)
async def create_trigger(
    trigger_data: TriggerCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new trigger for a workflow
    """
    try:
        # Verify workflow exists
        workflow = db.query(Workflow).filter(Workflow.id == trigger_data.workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        trigger = trigger_data.trigger
        
        # Create trigger based on type
        if isinstance(trigger, VisualTrigger):
            db_trigger = Trigger(
                workflow_id=trigger_data.workflow_id,
                trigger_type="visual",
                trigger_condition=trigger.trigger_condition,
                target_url=trigger.target_url,
                check_interval=trigger.check_interval,
                screenshot_selector=trigger.screenshot_selector,
                visual_threshold=trigger.visual_threshold,
                is_active=trigger.is_active
            )
        elif isinstance(trigger, DataTrigger):
            db_trigger = Trigger(
                workflow_id=trigger_data.workflow_id,
                trigger_type="data",
                trigger_condition=trigger.trigger_condition,
                target_url=trigger.target_url,
                check_interval=trigger.check_interval,
                data_field=trigger.data_field,
                data_operator=trigger.data_operator,
                data_value=trigger.data_value,
                is_active=trigger.is_active
            )
        elif isinstance(trigger, ElementTrigger):
            db_trigger = Trigger(
                workflow_id=trigger_data.workflow_id,
                trigger_type="element",
                trigger_condition=trigger.trigger_condition,
                target_url=trigger.target_url,
                check_interval=trigger.check_interval,
                element_selector=trigger.element_selector,
                element_condition=trigger.element_condition,
                is_active=trigger.is_active
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid trigger type")
        
        db.add(db_trigger)
        db.commit()
        db.refresh(db_trigger)
        
        return TriggerResponse.from_orm(db_trigger)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating trigger: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create trigger: {str(e)}")


@router.get("/", response_model=List[TriggerResponse])
async def list_triggers(
    workflow_id: int = None,
    db: Session = Depends(get_db)
):
    """
    List triggers with optional workflow filtering
    """
    try:
        query = db.query(Trigger)
        
        if workflow_id:
            query = query.filter(Trigger.workflow_id == workflow_id)
        
        triggers = query.all()
        return [TriggerResponse.from_orm(trigger) for trigger in triggers]
        
    except Exception as e:
        logger.error(f"Error listing triggers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list triggers: {str(e)}")


@router.get("/{trigger_id}", response_model=TriggerResponse)
async def get_trigger(
    trigger_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific trigger by ID
    """
    try:
        trigger = db.query(Trigger).filter(Trigger.id == trigger_id).first()
        
        if not trigger:
            raise HTTPException(status_code=404, detail="Trigger not found")
        
        return TriggerResponse.from_orm(trigger)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trigger: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get trigger: {str(e)}")


@router.delete("/{trigger_id}")
async def delete_trigger(
    trigger_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a trigger
    """
    try:
        trigger = db.query(Trigger).filter(Trigger.id == trigger_id).first()
        
        if not trigger:
            raise HTTPException(status_code=404, detail="Trigger not found")
        
        db.delete(trigger)
        db.commit()
        
        return {"message": "Trigger deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting trigger: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete trigger: {str(e)}")


@router.post("/{trigger_id}/toggle")
async def toggle_trigger(
    trigger_id: int,
    db: Session = Depends(get_db)
):
    """
    Toggle trigger active status
    """
    try:
        trigger = db.query(Trigger).filter(Trigger.id == trigger_id).first()
        
        if not trigger:
            raise HTTPException(status_code=404, detail="Trigger not found")
        
        trigger.is_active = not trigger.is_active
        db.commit()
        
        return {
            "trigger_id": trigger_id,
            "is_active": trigger.is_active,
            "message": f"Trigger {'activated' if trigger.is_active else 'deactivated'}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling trigger: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle trigger: {str(e)}")