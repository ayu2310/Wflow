import google.generativeai as genai
from typing import Dict, List, Any, Optional
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini AI
genai.configure(api_key=settings.gemini_api_key)

class AIService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
        self.vision_model = genai.GenerativeModel('gemini-pro-vision')
        
    async def interpret_workflow(self, natural_language_prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Interpret natural language workflow description into structured steps
        """
        try:
            system_prompt = """
            You are an expert browser automation specialist. Your task is to interpret natural language descriptions of web workflows and convert them into structured, executable steps.
            
            Analyze the user's request and break it down into:
            1. Navigation steps (URLs to visit)
            2. Interaction steps (clicks, form fills, etc.)
            3. Data extraction steps (what information to collect)
            4. Conditional logic (if/then scenarios)
            5. Error handling requirements
            
            Return a JSON object with the following structure:
            {
                "interpreted_steps": [
                    {
                        "step_number": 1,
                        "action_type": "navigate|click|fill|extract|wait|conditional",
                        "description": "Human readable description",
                        "target": "URL or selector",
                        "parameters": {},
                        "expected_outcome": "What should happen",
                        "error_handling": "How to handle failures"
                    }
                ],
                "confidence_score": 0.95,
                "estimated_duration": 120,
                "potential_risks": ["List of potential issues"],
                "recommendations": ["Suggestions for improvement"],
                "required_data": ["What data sources are needed"],
                "browser_requirements": {
                    "headless": true,
                    "viewport": {"width": 1920, "height": 1080},
                    "user_agent": "string"
                }
            }
            
            Be specific about selectors, timing, and error conditions. Consider edge cases and provide robust automation strategies.
            """
            
            user_prompt = f"""
            Workflow Description: {natural_language_prompt}
            
            Additional Context: {context or 'None'}
            
            Please interpret this workflow and provide the structured breakdown.
            """
            
            response = self.model.generate_content([system_prompt, user_prompt])
            
            # Parse the response
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract JSON from the response
                import re
                json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    return result
                else:
                    raise ValueError("Could not parse AI response as JSON")
                    
        except Exception as e:
            logger.error(f"Error interpreting workflow: {str(e)}")
            raise
    
    async def analyze_screenshot(self, screenshot_path: str, task_description: str) -> Dict[str, Any]:
        """
        Analyze screenshot using Gemini Vision to understand page elements
        """
        try:
            from PIL import Image
            
            # Load the screenshot
            image = Image.open(screenshot_path)
            
            prompt = f"""
            Analyze this webpage screenshot and help with the following task: {task_description}
            
            Please identify:
            1. Interactive elements (buttons, links, form fields)
            2. Text content and labels
            3. Layout structure
            4. Any relevant data or information
            5. Potential selectors for automation
            
            Return your analysis as a JSON object with:
            - identified_elements: List of interactive elements with their likely selectors
            - text_content: Important text found on the page
            - layout_info: General layout description
            - recommendations: Suggestions for automation approach
            """
            
            response = self.vision_model.generate_content([prompt, image])
            
            # Parse the response
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                # Fallback to text analysis
                return {
                    "analysis": response.text,
                    "identified_elements": [],
                    "text_content": "",
                    "layout_info": "",
                    "recommendations": []
                }
                
        except Exception as e:
            logger.error(f"Error analyzing screenshot: {str(e)}")
            raise
    
    async def generate_selector_strategy(self, element_description: str, page_context: str) -> Dict[str, Any]:
        """
        Generate optimal selector strategy for an element
        """
        try:
            prompt = f"""
            Given this element description: "{element_description}"
            And this page context: "{page_context}"
            
            Generate the best selector strategy for this element. Consider:
            1. CSS selectors (preferred)
            2. XPath selectors (if CSS is not sufficient)
            3. Text-based selectors
            4. Position-based selectors (as fallback)
            
            Return a JSON object with:
            {
                "primary_selector": "Best CSS selector",
                "fallback_selectors": ["Alternative selectors"],
                "confidence": 0.95,
                "reasoning": "Why this selector was chosen",
                "potential_issues": ["What might go wrong"],
                "recommendations": ["How to make it more robust"]
            }
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                return {
                    "primary_selector": "",
                    "fallback_selectors": [],
                    "confidence": 0.0,
                    "reasoning": "Could not parse AI response",
                    "potential_issues": [],
                    "recommendations": []
                }
                
        except Exception as e:
            logger.error(f"Error generating selector strategy: {str(e)}")
            raise
    
    async def validate_workflow_steps(self, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate and optimize workflow steps
        """
        try:
            steps_json = json.dumps(steps, indent=2)
            
            prompt = f"""
            Review and validate these workflow steps:
            {steps_json}
            
            Check for:
            1. Logical flow and dependencies
            2. Missing error handling
            3. Potential timing issues
            4. Selector reliability
            5. Data consistency
            
            Return a JSON object with:
            {
                "is_valid": true,
                "validation_errors": [],
                "warnings": [],
                "optimizations": [],
                "estimated_success_rate": 0.95,
                "recommended_improvements": []
            }
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                return {
                    "is_valid": False,
                    "validation_errors": ["Could not parse validation response"],
                    "warnings": [],
                    "optimizations": [],
                    "estimated_success_rate": 0.0,
                    "recommended_improvements": []
                }
                
        except Exception as e:
            logger.error(f"Error validating workflow steps: {str(e)}")
            raise
    
    async def generate_error_recovery_strategy(self, error_description: str, workflow_context: str) -> Dict[str, Any]:
        """
        Generate error recovery strategies for failed workflows
        """
        try:
            prompt = f"""
            A workflow failed with this error: "{error_description}"
            Workflow context: "{workflow_context}"
            
            Generate recovery strategies including:
            1. Immediate retry with different approach
            2. Alternative selectors or methods
            3. Wait and retry strategies
            4. Fallback workflows
            
            Return a JSON object with:
            {
                "recovery_strategies": [
                    {
                        "strategy": "retry_with_delay",
                        "description": "Wait 5 seconds and retry",
                        "parameters": {"delay": 5, "max_retries": 3},
                        "success_probability": 0.8
                    }
                ],
                "root_cause_analysis": "Likely cause of the error",
                "prevention_tips": ["How to avoid this in the future"],
                "recommended_action": "immediate_retry|alternative_approach|manual_intervention"
            }
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                return {
                    "recovery_strategies": [],
                    "root_cause_analysis": "Unknown",
                    "prevention_tips": [],
                    "recommended_action": "manual_intervention"
                }
                
        except Exception as e:
            logger.error(f"Error generating recovery strategy: {str(e)}")
            raise


# Global AI service instance
ai_service = AIService()