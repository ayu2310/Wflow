const stagehandService = require('../stagehand/stagehandService');
const browserbaseService = require('../browserbase/browserbaseService');
const Execution = require('../../server/models/Execution');
const logger = require('../../server/utils/logger');

class WorkflowExecutionEngine {
  constructor() {
    this.activeExecutions = new Map();
  }

  /**
   * Execute a workflow
   * @param {Object} workflow - Workflow object
   * @param {Object} execution - Execution object
   * @param {Object} options - Execution options
   * @returns {Object} Execution result
   */
  async executeWorkflow(workflow, execution, options = {}) {
    let browserSession = null;
    let stagehandInstance = null;

    try {
      // Create execution record
      await execution.markAsStarted();

      // Create browser session
      browserSession = await browserbaseService.createSession({
        headless: workflow.settings.headless,
        viewport: workflow.settings.viewport,
        timezone: options.timezone || 'UTC'
      });

      execution.browserSessionId = browserSession.id;
      await execution.save();

      // Create Stagehand instance
      stagehandInstance = await stagehandService.createInstance(
        browserSession.id,
        {
          headless: workflow.settings.headless,
          viewport: workflow.settings.viewport
        }
      );

      // Store active execution
      this.activeExecutions.set(execution._id.toString(), {
        execution,
        browserSession,
        stagehandInstance,
        startTime: Date.now()
      });

      // Execute workflow steps
      const results = await this.executeSteps(
        workflow.steps,
        browserSession.id,
        execution,
        options
      );

      // Mark execution as completed
      await execution.markAsCompleted(results);

      // Update workflow statistics
      await workflow.updateExecutionStats(true);

      logger.info(`Workflow execution completed: ${execution._id}`);

      return {
        success: true,
        executionId: execution._id,
        results,
        duration: execution.duration
      };

    } catch (error) {
      logger.error(`Workflow execution failed: ${execution._id}`, error);

      // Mark execution as failed
      await execution.markAsFailed(error);

      // Update workflow statistics
      await workflow.updateExecutionStats(false);

      return {
        success: false,
        executionId: execution._id,
        error: error.message,
        duration: execution.duration
      };

    } finally {
      // Cleanup
      await this.cleanupExecution(execution._id.toString());
    }
  }

  /**
   * Execute workflow steps
   * @param {Array} steps - Workflow steps
   * @param {string} sessionId - Browser session ID
   * @param {Object} execution - Execution object
   * @param {Object} options - Execution options
   * @returns {Object} Step results
   */
  async executeSteps(steps, sessionId, execution, options = {}) {
    const results = {};
    const sortedSteps = steps.sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      try {
        await execution.addLog('info', `Executing step: ${step.id} (${step.type})`);

        const stepResult = await this.executeStep(step, sessionId, execution, options);
        results[step.id] = stepResult;

        await execution.addLog('info', `Step completed: ${step.id}`);

      } catch (error) {
        await execution.addLog('error', `Step failed: ${step.id}`, { error: error.message });
        
        if (step.config.required !== false) {
          throw error;
        }
        
        // Continue with next step if step is not required
        results[step.id] = { error: error.message, skipped: true };
      }
    }

    return results;
  }

  /**
   * Execute a single workflow step
   * @param {Object} step - Step configuration
   * @param {string} sessionId - Browser session ID
   * @param {Object} execution - Execution object
   * @param {Object} options - Execution options
   * @returns {Object} Step result
   */
  async executeStep(step, sessionId, execution, options = {}) {
    const { type, config } = step;

    switch (type) {
      case 'navigate':
        return await this.executeNavigate(sessionId, config, execution);
      
      case 'act':
        return await this.executeAct(sessionId, config, execution);
      
      case 'extract':
        return await this.executeExtract(sessionId, config, execution);
      
      case 'observe':
        return await this.executeObserve(sessionId, config, execution);
      
      case 'agent':
        return await this.executeAgent(sessionId, config, execution);
      
      case 'wait':
        return await this.executeWait(sessionId, config, execution);
      
      case 'condition':
        return await this.executeCondition(sessionId, config, execution);
      
      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  /**
   * Execute navigate step
   */
  async executeNavigate(sessionId, config, execution) {
    const { url, options = {} } = config;
    
    await execution.addLog('info', `Navigating to: ${url}`);
    
    const result = await stagehandService.navigate(sessionId, url, options);
    
    await execution.addLog('info', `Navigation completed: ${url}`);
    
    return result;
  }

  /**
   * Execute act step
   */
  async executeAct(sessionId, config, execution) {
    const { action, options = {} } = config;
    
    await execution.addLog('info', `Performing action: ${action}`);
    
    const result = await stagehandService.act(sessionId, action, options);
    
    await execution.addLog('info', `Action completed: ${action}`);
    
    return result;
  }

  /**
   * Execute extract step
   */
  async executeExtract(sessionId, config, execution) {
    const { schema, options = {} } = config;
    
    await execution.addLog('info', 'Extracting data from page');
    
    const result = await stagehandService.extract(sessionId, schema, options);
    
    await execution.addLog('info', 'Data extraction completed');
    
    return result;
  }

  /**
   * Execute observe step
   */
  async executeObserve(sessionId, config, execution) {
    const { options = {} } = config;
    
    await execution.addLog('info', 'Observing page for available actions');
    
    const result = await stagehandService.observe(sessionId, options);
    
    await execution.addLog('info', 'Page observation completed');
    
    return result;
  }

  /**
   * Execute agent step
   */
  async executeAgent(sessionId, config, execution) {
    const { goal, options = {} } = config;
    
    await execution.addLog('info', `Starting agent with goal: ${goal}`);
    
    const result = await stagehandService.agent(sessionId, goal, options);
    
    await execution.addLog('info', 'Agent execution completed');
    
    return result;
  }

  /**
   * Execute wait step
   */
  async executeWait(sessionId, config, execution) {
    const { condition, timeout = 30000, options = {} } = config;
    
    await execution.addLog('info', `Waiting for condition: ${condition}`);
    
    const result = await stagehandService.wait(sessionId, condition, {
      timeout,
      ...options
    });
    
    await execution.addLog('info', 'Wait condition satisfied');
    
    return result;
  }

  /**
   * Execute condition step
   */
  async executeCondition(sessionId, config, execution) {
    const { condition, trueSteps = [], falseSteps = [] } = config;
    
    await execution.addLog('info', `Evaluating condition: ${condition}`);
    
    // This is a simplified condition evaluation
    // In a real implementation, you'd have a more sophisticated condition parser
    const conditionResult = await this.evaluateCondition(condition, sessionId);
    
    await execution.addLog('info', `Condition result: ${conditionResult}`);
    
    if (conditionResult) {
      if (trueSteps.length > 0) {
        return await this.executeSteps(trueSteps, sessionId, execution, {});
      }
    } else {
      if (falseSteps.length > 0) {
        return await this.executeSteps(falseSteps, sessionId, execution, {});
      }
    }
    
    return { conditionResult };
  }

  /**
   * Evaluate a condition
   * @param {string} condition - Condition to evaluate
   * @param {string} sessionId - Browser session ID
   * @returns {boolean} Condition result
   */
  async evaluateCondition(condition, sessionId) {
    // This is a simplified implementation
    // In production, you'd want a more sophisticated condition evaluator
    
    try {
      // Example conditions:
      // "element_exists:button[data-testid='submit']"
      // "text_contains:Welcome"
      // "url_equals:https://example.com/success"
      
      if (condition.startsWith('element_exists:')) {
        const selector = condition.replace('element_exists:', '');
        // Use Stagehand to check if element exists
        const result = await stagehandService.act(sessionId, `Check if element with selector "${selector}" exists`);
        return result.success;
      }
      
      if (condition.startsWith('text_contains:')) {
        const text = condition.replace('text_contains:', '');
        const result = await stagehandService.act(sessionId, `Check if page contains text "${text}"`);
        return result.success;
      }
      
      if (condition.startsWith('url_equals:')) {
        const url = condition.replace('url_equals:', '');
        const result = await stagehandService.act(sessionId, `Check if current URL equals "${url}"`);
        return result.success;
      }
      
      return false;
    } catch (error) {
      logger.error('Condition evaluation failed:', error);
      return false;
    }
  }

  /**
   * Cancel an active execution
   * @param {string} executionId - Execution ID
   * @returns {boolean} Success status
   */
  async cancelExecution(executionId) {
    try {
      const activeExecution = this.activeExecutions.get(executionId);
      
      if (!activeExecution) {
        return false;
      }

      const { execution, browserSession } = activeExecution;

      // Mark execution as cancelled
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      await execution.save();

      // Close browser session
      await browserbaseService.closeSession(browserSession.id);

      // Cleanup
      await this.cleanupExecution(executionId);

      logger.info(`Execution cancelled: ${executionId}`);
      return true;

    } catch (error) {
      logger.error(`Failed to cancel execution ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Get active execution status
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Execution status
   */
  getExecutionStatus(executionId) {
    const activeExecution = this.activeExecutions.get(executionId);
    
    if (!activeExecution) {
      return null;
    }

    const { execution, startTime } = activeExecution;
    const duration = Date.now() - startTime;

    return {
      executionId,
      status: execution.status,
      duration,
      progress: this.calculateProgress(execution)
    };
  }

  /**
   * Calculate execution progress
   * @param {Object} execution - Execution object
   * @returns {number} Progress percentage
   */
  calculateProgress(execution) {
    // This is a simplified progress calculation
    // In production, you'd track step completion more precisely
    const totalSteps = execution.metadata.totalSteps || 1;
    const completedSteps = execution.metadata.completedSteps || 0;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Cleanup execution resources
   * @param {string} executionId - Execution ID
   */
  async cleanupExecution(executionId) {
    try {
      const activeExecution = this.activeExecutions.get(executionId);
      
      if (activeExecution) {
        const { browserSession, stagehandInstance } = activeExecution;

        // Close Stagehand instance
        if (stagehandInstance) {
          await stagehandService.closeInstance(browserSession.id);
        }

        // Close browser session
        if (browserSession) {
          await browserbaseService.closeSession(browserSession.id);
        }

        // Remove from active executions
        this.activeExecutions.delete(executionId);
      }

    } catch (error) {
      logger.error(`Failed to cleanup execution ${executionId}:`, error);
    }
  }

  /**
   * Get all active executions
   * @returns {Array} Active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Cleanup all active executions
   */
  async cleanupAllExecutions() {
    try {
      const executionIds = this.getActiveExecutions();
      await Promise.all(executionIds.map(id => this.cleanupExecution(id)));
      logger.info('All active executions cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup all executions:', error);
      throw error;
    }
  }
}

module.exports = new WorkflowExecutionEngine();