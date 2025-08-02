import asyncio
import logging
import os
import tempfile
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import json
from browser_use import BrowserUse
from app.core.config import settings
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

class BrowserService:
    def __init__(self):
        self.browser = None
        self.screenshot_dir = Path("screenshots")
        self.screenshot_dir.mkdir(exist_ok=True)
        
    async def initialize_browser(self, browser_type: str = "chrome", headless: bool = True):
        """
        Initialize browser instance
        """
        try:
            browser_options = {
                "headless": headless,
                "timeout": settings.browser_timeout,
                "viewport": {"width": 1920, "height": 1080}
            }
            
            self.browser = BrowserUse(browser_type, **browser_options)
            await self.browser.start()
            logger.info(f"Browser initialized: {browser_type}, headless: {headless}")
            
        except Exception as e:
            logger.error(f"Failed to initialize browser: {str(e)}")
            raise
    
    async def close_browser(self):
        """
        Close browser instance
        """
        if self.browser:
            await self.browser.close()
            self.browser = None
            logger.info("Browser closed")
    
    async def execute_workflow_step(self, step: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a single workflow step
        """
        try:
            action_type = step.get("action_type")
            target = step.get("target")
            parameters = step.get("parameters", {})
            
            result = {
                "step_number": step.get("step_number"),
                "action_type": action_type,
                "success": False,
                "data": None,
                "screenshot": None,
                "error": None,
                "duration": 0
            }
            
            start_time = datetime.now()
            
            if action_type == "navigate":
                result = await self._navigate_to_url(target, parameters)
                
            elif action_type == "click":
                result = await self._click_element(target, parameters)
                
            elif action_type == "fill":
                result = await self._fill_form(target, parameters)
                
            elif action_type == "extract":
                result = await self._extract_data(target, parameters)
                
            elif action_type == "wait":
                result = await self._wait_action(target, parameters)
                
            elif action_type == "conditional":
                result = await self._execute_conditional(target, parameters, context)
                
            else:
                result["error"] = f"Unknown action type: {action_type}"
            
            end_time = datetime.now()
            result["duration"] = (end_time - start_time).total_seconds()
            
            # Take screenshot for debugging
            if result["success"]:
                result["screenshot"] = await self._take_screenshot()
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing workflow step: {str(e)}")
            return {
                "step_number": step.get("step_number"),
                "action_type": step.get("action_type"),
                "success": False,
                "error": str(e),
                "duration": 0
            }
    
    async def _navigate_to_url(self, url: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Navigate to a URL
        """
        try:
            await self.browser.goto(url)
            
            # Wait for page load if specified
            wait_time = parameters.get("wait_time", 3000)
            if wait_time > 0:
                await asyncio.sleep(wait_time / 1000)
            
            return {
                "success": True,
                "data": {"url": url, "title": await self.browser.title()},
                "screenshot": await self._take_screenshot()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _click_element(self, selector: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Click on an element
        """
        try:
            # Try multiple selector strategies
            selectors = [selector] + parameters.get("fallback_selectors", [])
            
            for sel in selectors:
                try:
                    await self.browser.click(sel)
                    
                    # Wait for action to complete
                    wait_time = parameters.get("wait_time", 1000)
                    if wait_time > 0:
                        await asyncio.sleep(wait_time / 1000)
                    
                    return {
                        "success": True,
                        "data": {"selector": sel, "action": "clicked"},
                        "screenshot": await self._take_screenshot()
                    }
                    
                except Exception as e:
                    logger.warning(f"Failed to click selector {sel}: {str(e)}")
                    continue
            
            # If all selectors fail, try AI-assisted element finding
            return await self._ai_assisted_click(selector, parameters)
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _fill_form(self, selector: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fill a form field
        """
        try:
            value = parameters.get("value", "")
            clear_first = parameters.get("clear_first", True)
            
            if clear_first:
                await self.browser.clear(selector)
            
            await self.browser.type(selector, value)
            
            return {
                "success": True,
                "data": {"selector": selector, "value": value},
                "screenshot": await self._take_screenshot()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _extract_data(self, selector: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract data from elements
        """
        try:
            extraction_type = parameters.get("type", "text")
            
            if extraction_type == "text":
                data = await self.browser.text(selector)
            elif extraction_type == "attribute":
                attr = parameters.get("attribute", "href")
                data = await self.browser.attribute(selector, attr)
            elif extraction_type == "multiple":
                data = await self.browser.text_all(selector)
            else:
                data = await self.browser.text(selector)
            
            return {
                "success": True,
                "data": {"selector": selector, "extracted_data": data},
                "screenshot": await self._take_screenshot()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _wait_action(self, condition: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Wait for a condition
        """
        try:
            wait_type = parameters.get("type", "time")
            timeout = parameters.get("timeout", 10000)
            
            if wait_type == "time":
                await asyncio.sleep(timeout / 1000)
            elif wait_type == "element":
                await self.browser.wait_for_element(condition, timeout=timeout)
            elif wait_type == "text":
                await self.browser.wait_for_text(condition, timeout=timeout)
            
            return {
                "success": True,
                "data": {"condition": condition, "wait_type": wait_type},
                "screenshot": await self._take_screenshot()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_conditional(self, condition: str, parameters: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute conditional logic
        """
        try:
            condition_type = parameters.get("type", "element_exists")
            
            if condition_type == "element_exists":
                exists = await self.browser.exists(condition)
                result = exists
            elif condition_type == "text_contains":
                text = await self.browser.text(condition)
                search_text = parameters.get("search_text", "")
                result = search_text in text
            elif condition_type == "custom":
                # Execute custom JavaScript condition
                js_code = parameters.get("javascript", "")
                result = await self.browser.evaluate(js_code)
            else:
                result = False
            
            return {
                "success": True,
                "data": {"condition": condition, "result": result},
                "screenshot": await self._take_screenshot()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _ai_assisted_click(self, element_description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use AI to find and click elements when selectors fail
        """
        try:
            # Take screenshot for AI analysis
            screenshot_path = await self._take_screenshot()
            
            # Use AI to analyze the screenshot and find the element
            analysis = await ai_service.analyze_screenshot(
                screenshot_path, 
                f"Find and click element: {element_description}"
            )
            
            # Try to find the element based on AI analysis
            identified_elements = analysis.get("identified_elements", [])
            
            for element in identified_elements:
                if element_description.lower() in element.get("description", "").lower():
                    selector = element.get("selector")
                    if selector:
                        try:
                            await self.browser.click(selector)
                            return {
                                "success": True,
                                "data": {"selector": selector, "ai_assisted": True},
                                "screenshot": screenshot_path
                            }
                        except Exception as e:
                            continue
            
            return {"success": False, "error": "AI could not find the specified element"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _take_screenshot(self) -> str:
        """
        Take a screenshot and return the file path
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshot_{timestamp}.png"
            filepath = self.screenshot_dir / filename
            
            await self.browser.screenshot(str(filepath))
            return str(filepath)
            
        except Exception as e:
            logger.error(f"Failed to take screenshot: {str(e)}")
            return ""
    
    async def execute_workflow(self, workflow_steps: List[Dict[str, Any]], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a complete workflow
        """
        try:
            results = []
            context = context or {}
            
            for step in workflow_steps:
                step_result = await self.execute_workflow_step(step, context)
                results.append(step_result)
                
                # Update context with step results
                if step_result["success"]:
                    context[f"step_{step['step_number']}_result"] = step_result["data"]
                
                # Check if step failed and handle accordingly
                if not step_result["success"]:
                    # Try error recovery
                    recovery_result = await self._handle_step_failure(step, step_result, context)
                    if recovery_result["success"]:
                        step_result = recovery_result
                        results[-1] = step_result
                    else:
                        # Stop execution if recovery failed
                        break
            
            # Calculate overall success
            successful_steps = sum(1 for r in results if r["success"])
            total_steps = len(results)
            
            return {
                "workflow_success": successful_steps == total_steps,
                "steps_completed": successful_steps,
                "total_steps": total_steps,
                "step_results": results,
                "context": context,
                "screenshots": [r["screenshot"] for r in results if r["screenshot"]]
            }
            
        except Exception as e:
            logger.error(f"Error executing workflow: {str(e)}")
            return {
                "workflow_success": False,
                "error": str(e),
                "steps_completed": 0,
                "total_steps": len(workflow_steps),
                "step_results": []
            }
    
    async def _handle_step_failure(self, step: Dict[str, Any], step_result: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle workflow step failures with AI-assisted recovery
        """
        try:
            error_description = step_result.get("error", "Unknown error")
            workflow_context = f"Step {step['step_number']}: {step.get('description', '')}"
            
            # Get AI recovery strategy
            recovery_strategy = await ai_service.generate_error_recovery_strategy(
                error_description, workflow_context
            )
            
            # Try the recommended recovery action
            recommended_action = recovery_strategy.get("recommended_action", "manual_intervention")
            
            if recommended_action == "immediate_retry":
                # Simple retry with delay
                await asyncio.sleep(2)
                return await self.execute_workflow_step(step, context)
                
            elif recommended_action == "alternative_approach":
                # Try alternative selectors or methods
                fallback_selectors = step.get("parameters", {}).get("fallback_selectors", [])
                for selector in fallback_selectors:
                    try:
                        step["target"] = selector
                        return await self.execute_workflow_step(step, context)
                    except Exception:
                        continue
            
            # If all recovery attempts fail
            return {
                "success": False,
                "error": f"Recovery failed: {error_description}",
                "recovery_attempted": True
            }
            
        except Exception as e:
            logger.error(f"Error in step failure recovery: {str(e)}")
            return {"success": False, "error": str(e)}


# Global browser service instance
browser_service = BrowserService()