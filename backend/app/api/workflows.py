from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.models.workflow import Workflow
from app.models.schemas import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowSummary
)
from app.services.ai_service import ai_service
from app.services.browser_service import browser_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new workflow with AI interpretation
    """
    try:
        # Use AI to interpret the natural language prompt
        ai_interpretation = await ai_service.interpret_workflow(
            workflow.natural_language_prompt
        )
        
        # Create workflow in database
        db_workflow = Workflow(
            name=workflow.name,
            description=workflow.description,
            natural_language_prompt=workflow.natural_language_prompt,
            ai_interpreted_steps=ai_interpretation.get("interpreted_steps"),
            browser_type=workflow.browser_type,
            headless=workflow.headless,
            timeout=workflow.timeout,
            max_retries=workflow.max_retries,
            retry_delay=workflow.retry_delay,
            status="draft"
        )
        
        db.add(db_workflow)
        db.commit()
        db.refresh(db_workflow)
        
        return WorkflowResponse.from_orm(db_workflow)
        
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workflow: {str(e)}"
        )


@router.get("/", response_model=List[WorkflowSummary])
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all workflows with optional filtering
    """
    try:
        query = db.query(Workflow)
        
        if status:
            query = query.filter(Workflow.status == status)
        
        workflows = query.offset(skip).limit(limit).all()
        
        # Convert to summary format
        summaries = []
        for workflow in workflows:
            # Calculate success rate from executions
            executions = workflow.executions
            total_executions = len(executions)
            successful_executions = len([e for e in executions if e.status == "completed"])
            success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
            
            # Get last execution
            last_execution = max(executions, key=lambda x: x.created_at) if executions else None
            
            summary = WorkflowSummary(
                id=workflow.id,
                name=workflow.name,
                status=workflow.status,
                last_execution=last_execution.created_at if last_execution else None,
                success_rate=success_rate,
                average_duration=None,  # TODO: Calculate from executions
                next_scheduled_run=None  # TODO: Calculate from schedules
            )
            summaries.append(summary)
        
        return summaries
        
    except Exception as e:
        logger.error(f"Error listing workflows: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list workflows: {str(e)}"
        )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific workflow by ID
    """
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        return WorkflowResponse.from_orm(workflow)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow: {str(e)}"
        )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_update: WorkflowUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a workflow
    """
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        # Update fields if provided
        update_data = workflow_update.dict(exclude_unset=True)
        
        # If natural language prompt is updated, re-interpret with AI
        if "natural_language_prompt" in update_data:
            ai_interpretation = await ai_service.interpret_workflow(
                update_data["natural_language_prompt"]
            )
            update_data["ai_interpreted_steps"] = ai_interpretation.get("interpreted_steps")
        
        for field, value in update_data.items():
            setattr(workflow, field, value)
        
        db.commit()
        db.refresh(workflow)
        
        return WorkflowResponse.from_orm(workflow)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update workflow: {str(e)}"
        )


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a workflow
    """
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        db.delete(workflow)
        db.commit()
        
        return {"message": "Workflow deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete workflow: {str(e)}"
        )


@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Execute a workflow immediately
    """
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        if not workflow.ai_interpreted_steps:
            raise HTTPException(
                status_code=400,
                detail="Workflow has no interpreted steps"
            )
        
        # Initialize browser
        await browser_service.initialize_browser(
            workflow.browser_type,
            workflow.headless
        )
        
        try:
            # Execute workflow
            result = await browser_service.execute_workflow(
                workflow.ai_interpreted_steps
            )
            
            # Create execution record
            from app.models.workflow import Execution
            execution = Execution(
                workflow_id=workflow_id,
                status="completed" if result["workflow_success"] else "failed",
                result_data=result,
                error_message=result.get("error"),
                screenshots=result.get("screenshots", []),
                steps_completed=result["steps_completed"],
                total_steps=result["total_steps"]
            )
            
            db.add(execution)
            db.commit()
            
            return {
                "execution_id": execution.id,
                "success": result["workflow_success"],
                "steps_completed": result["steps_completed"],
                "total_steps": result["total_steps"],
                "screenshots": result.get("screenshots", [])
            }
            
        finally:
            await browser_service.close_browser()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute workflow: {str(e)}"
        )


@router.post("/{workflow_id}/test")
async def test_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Test a workflow with a dry run (no actual execution)
    """
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        if not workflow.ai_interpreted_steps:
            raise HTTPException(
                status_code=400,
                detail="Workflow has no interpreted steps"
            )
        
        # Validate workflow steps
        validation_result = await ai_service.validate_workflow_steps(
            workflow.ai_interpreted_steps
        )
        
        return {
            "workflow_id": workflow_id,
            "validation_result": validation_result,
            "estimated_duration": sum(
                step.get("estimated_duration", 5) 
                for step in workflow.ai_interpreted_steps
            ),
            "total_steps": len(workflow.ai_interpreted_steps)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test workflow: {str(e)}"
        )


@router.get("/stats")
async def get_workflow_stats(db: Session = Depends(get_db)):
    """
    Get overall workflow statistics
    """
    try:
        from app.models.workflow import Execution
        
        # Get workflow counts
        total_workflows = db.query(Workflow).count()
        active_workflows = db.query(Workflow).filter(Workflow.status == "active").count()
        
        # Get execution counts
        total_executions = db.query(Execution).count()
        successful_executions = db.query(Execution).filter(Execution.status == "completed").count()
        failed_executions = db.query(Execution).filter(Execution.status == "failed").count()
        
        # Calculate success rate
        success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
        
        # Calculate average execution time
        completed_executions = db.query(Execution).filter(Execution.status == "completed").all()
        if completed_executions:
            total_duration = sum(e.duration or 0 for e in completed_executions)
            average_execution_time = total_duration / len(completed_executions)
        else:
            average_execution_time = 0
        
        return {
            "total_workflows": total_workflows,
            "active_workflows": active_workflows,
            "total_executions": total_executions,
            "successful_executions": successful_executions,
            "failed_executions": failed_executions,
            "success_rate": success_rate,
            "average_execution_time": average_execution_time
        }
        
    except Exception as e:
        logger.error(f"Error getting workflow stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow stats: {str(e)}"
        )