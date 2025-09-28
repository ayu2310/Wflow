const { Stagehand } = require('stagehand');
const logger = require('../../server/utils/logger');

class StagehandService {
  constructor() {
    this.instances = new Map(); // Store Stagehand instances per session
  }

  /**
   * Initialize Stagehand with configuration
   * @param {Object} config - Configuration object
   * @param {string} config.openaiApiKey - OpenAI API key
   * @param {Object} config.browserConfig - Browser configuration
   */
  async initialize(config = {}) {
    try {
      const defaultConfig = {
        openaiApiKey: process.env.OPENAI_API_KEY,
        browserConfig: {
          headless: true,
          viewport: { width: 1280, height: 720 }
        }
      };

      this.config = { ...defaultConfig, ...config };
      
      if (!this.config.openaiApiKey) {
        throw new Error('OpenAI API key is required for Stagehand');
      }

      logger.info('Stagehand service initialized');
    } catch (error) {
      logger.error('Failed to initialize Stagehand service:', error);
      throw error;
    }
  }

  /**
   * Create a new Stagehand instance for a browser session
   * @param {string} sessionId - Browser session ID
   * @param {Object} browserConfig - Browser configuration
   * @returns {Stagehand} Stagehand instance
   */
  async createInstance(sessionId, browserConfig = {}) {
    try {
      const config = {
        ...this.config.browserConfig,
        ...browserConfig
      };

      const stagehand = new Stagehand({
        openaiApiKey: this.config.openaiApiKey,
        browserConfig: config
      });

      this.instances.set(sessionId, stagehand);
      logger.info(`Created Stagehand instance for session: ${sessionId}`);
      
      return stagehand;
    } catch (error) {
      logger.error(`Failed to create Stagehand instance for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get existing Stagehand instance
   * @param {string} sessionId - Browser session ID
   * @returns {Stagehand} Stagehand instance
   */
  getInstance(sessionId) {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new Error(`No Stagehand instance found for session: ${sessionId}`);
    }
    return instance;
  }

  /**
   * Execute an action using natural language
   * @param {string} sessionId - Browser session ID
   * @param {string} action - Natural language action description
   * @param {Object} options - Additional options
   * @returns {Object} Action result
   */
  async act(sessionId, action, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Executing action for session ${sessionId}: ${action}`);
      
      const result = await stagehand.act(action, options);
      
      logger.info(`Action completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Action failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Extract structured data from the current page
   * @param {string} sessionId - Browser session ID
   * @param {Object} schema - Data extraction schema
   * @param {Object} options - Additional options
   * @returns {Object} Extracted data
   */
  async extract(sessionId, schema, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Extracting data for session ${sessionId}`);
      
      const result = await stagehand.extract(schema, options);
      
      logger.info(`Data extraction completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Data extraction failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Observe available actions on the current page
   * @param {string} sessionId - Browser session ID
   * @param {Object} options - Additional options
   * @returns {Array} Available actions
   */
  async observe(sessionId, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Observing page for session ${sessionId}`);
      
      const result = await stagehand.observe(options);
      
      logger.info(`Observation completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Observation failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute an autonomous agent workflow
   * @param {string} sessionId - Browser session ID
   * @param {string} goal - Agent goal description
   * @param {Object} options - Additional options
   * @returns {Object} Agent execution result
   */
  async agent(sessionId, goal, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Starting agent for session ${sessionId}: ${goal}`);
      
      const result = await stagehand.agent(goal, options);
      
      logger.info(`Agent completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Agent failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Navigate to a URL
   * @param {string} sessionId - Browser session ID
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Object} Navigation result
   */
  async navigate(sessionId, url, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Navigating to ${url} for session ${sessionId}`);
      
      const result = await stagehand.navigate(url, options);
      
      logger.info(`Navigation completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Navigation failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for a condition or timeout
   * @param {string} sessionId - Browser session ID
   * @param {string|Function} condition - Condition to wait for
   * @param {Object} options - Wait options
   * @returns {Object} Wait result
   */
  async wait(sessionId, condition, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Waiting for condition for session ${sessionId}`);
      
      const result = await stagehand.wait(condition, options);
      
      logger.info(`Wait completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Wait failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Take a screenshot
   * @param {string} sessionId - Browser session ID
   * @param {Object} options - Screenshot options
   * @returns {Buffer} Screenshot buffer
   */
  async screenshot(sessionId, options = {}) {
    try {
      const stagehand = this.getInstance(sessionId);
      
      logger.info(`Taking screenshot for session ${sessionId}`);
      
      const result = await stagehand.screenshot(options);
      
      logger.info(`Screenshot completed for session ${sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Screenshot failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Close and cleanup Stagehand instance
   * @param {string} sessionId - Browser session ID
   */
  async closeInstance(sessionId) {
    try {
      const stagehand = this.instances.get(sessionId);
      if (stagehand) {
        await stagehand.close();
        this.instances.delete(sessionId);
        logger.info(`Closed Stagehand instance for session: ${sessionId}`);
      }
    } catch (error) {
      logger.error(`Failed to close Stagehand instance for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active session IDs
   * @returns {Array} Active session IDs
   */
  getActiveSessions() {
    return Array.from(this.instances.keys());
  }

  /**
   * Cleanup all instances
   */
  async cleanup() {
    try {
      const sessionIds = this.getActiveSessions();
      await Promise.all(sessionIds.map(sessionId => this.closeInstance(sessionId)));
      logger.info('All Stagehand instances cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup Stagehand instances:', error);
      throw error;
    }
  }
}

module.exports = new StagehandService();