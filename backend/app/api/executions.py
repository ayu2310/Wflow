from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.models.workflow import Execution
from app.models.schemas import ExecutionResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[ExecutionResponse])
async def list_executions(
    workflow_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List executions with optional filtering
    """
    try:
        query = db.query(Execution)
        
        if workflow_id:
            query = query.filter(Execution.workflow_id == workflow_id)
        
        if status:
            query = query.filter(Execution.status == status)
        
        executions = query.order_by(Execution.created_at.desc()).offset(skip).limit(limit).all()
        return [ExecutionResponse.from_orm(execution) for execution in executions]
        
    except Exception as e:
        logger.error(f"Error listing executions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list executions: {str(e)}")


@router.get("/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific execution by ID
    """
    try:
        execution = db.query(Execution).filter(Execution.id == execution_id).first()
        
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        return ExecutionResponse.from_orm(execution)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting execution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution: {str(e)}")


@router.delete("/{execution_id}")
async def delete_execution(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an execution
    """
    try:
        execution = db.query(Execution).filter(Execution.id == execution_id).first()
        
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        db.delete(execution)
        db.commit()
        
        return {"message": "Execution deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting execution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete execution: {str(e)}")


@router.get("/workflow/{workflow_id}/stats")
async def get_workflow_execution_stats(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Get execution statistics for a workflow
    """
    try:
        executions = db.query(Execution).filter(Execution.workflow_id == workflow_id).all()
        
        if not executions:
            return {
                "workflow_id": workflow_id,
                "total_executions": 0,
                "successful_executions": 0,
                "failed_executions": 0,
                "success_rate": 0.0,
                "average_duration": 0.0,
                "last_execution": None
            }
        
        total_executions = len(executions)
        successful_executions = len([e for e in executions if e.status == "completed"])
        failed_executions = total_executions - successful_executions
        success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
        
        # Calculate average duration
        durations = [e.duration for e in executions if e.duration is not None]
        average_duration = sum(durations) / len(durations) if durations else 0
        
        # Get last execution
        last_execution = max(executions, key=lambda x: x.created_at)
        
        return {
            "workflow_id": workflow_id,
            "total_executions": total_executions,
            "successful_executions": successful_executions,
            "failed_executions": failed_executions,
            "success_rate": success_rate,
            "average_duration": average_duration,
            "last_execution": last_execution.created_at
        }
        
    except Exception as e:
        logger.error(f"Error getting execution stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution stats: {str(e)}")