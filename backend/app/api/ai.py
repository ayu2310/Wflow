from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
import logging

from app.models.schemas import (
    WorkflowInterpretationRequest,
    WorkflowInterpretationResponse
)
from app.services.ai_service import ai_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/interpret", response_model=WorkflowInterpretationResponse)
async def interpret_workflow(request: WorkflowInterpretationRequest):
    """
    Interpret natural language workflow description into structured steps
    """
    try:
        result = await ai_service.interpret_workflow(
            request.natural_language_prompt,
            request.context
        )
        
        return WorkflowInterpretationResponse(
            interpreted_steps=result.get("interpreted_steps", []),
            confidence_score=result.get("confidence_score", 0.0),
            estimated_duration=result.get("estimated_duration", 0),
            potential_risks=result.get("potential_risks", []),
            recommendations=result.get("recommendations", [])
        )
        
    except Exception as e:
        logger.error(f"Error interpreting workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to interpret workflow: {str(e)}"
        )


@router.post("/analyze-screenshot")
async def analyze_screenshot(
    task_description: str,
    screenshot: UploadFile = File(...)
):
    """
    Analyze screenshot using AI vision to understand page elements
    """
    try:
        # Save uploaded screenshot temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_file:
            content = await screenshot.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            result = await ai_service.analyze_screenshot(
                tmp_file_path,
                task_description
            )
            return result
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
    except Exception as e:
        logger.error(f"Error analyzing screenshot: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze screenshot: {str(e)}"
        )


@router.post("/generate-selector")
async def generate_selector_strategy(
    element_description: str,
    page_context: str
):
    """
    Generate optimal selector strategy for an element
    """
    try:
        result = await ai_service.generate_selector_strategy(
            element_description,
            page_context
        )
        return result
        
    except Exception as e:
        logger.error(f"Error generating selector strategy: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate selector strategy: {str(e)}"
        )


@router.post("/validate-workflow")
async def validate_workflow_steps(steps: list):
    """
    Validate and optimize workflow steps
    """
    try:
        result = await ai_service.validate_workflow_steps(steps)
        return result
        
    except Exception as e:
        logger.error(f"Error validating workflow steps: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate workflow steps: {str(e)}"
        )


@router.post("/error-recovery")
async def generate_error_recovery_strategy(
    error_description: str,
    workflow_context: str
):
    """
    Generate error recovery strategies for failed workflows
    """
    try:
        result = await ai_service.generate_error_recovery_strategy(
            error_description,
            workflow_context
        )
        return result
        
    except Exception as e:
        logger.error(f"Error generating recovery strategy: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recovery strategy: {str(e)}"
        )