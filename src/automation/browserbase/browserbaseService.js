const axios = require('axios');
const logger = require('../../server/utils/logger');

class BrowserbaseService {
  constructor() {
    this.apiKey = process.env.BROWSERBASE_API_KEY;
    this.projectId = process.env.BROWSERBASE_PROJECT_ID;
    this.baseURL = 'https://api.browserbase.com/v1';
    this.sessions = new Map(); // Store session information
  }

  /**
   * Initialize Browserbase service
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('Browserbase API key is required');
    }
    if (!this.projectId) {
      throw new Error('Browserbase project ID is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info('Browserbase service initialized');
  }

  /**
   * Create a new browser session
   * @param {Object} options - Session options
   * @returns {Object} Session information
   */
  async createSession(options = {}) {
    try {
      const defaultOptions = {
        projectId: this.projectId,
        headless: true,
        viewport: {
          width: 1280,
          height: 720
        },
        timezone: 'UTC',
        locale: 'en-US'
      };

      const sessionOptions = { ...defaultOptions, ...options };

      const response = await this.client.post('/sessions', sessionOptions);
      const session = response.data;

      // Store session information
      this.sessions.set(session.id, {
        id: session.id,
        createdAt: new Date(),
        status: 'active',
        options: sessionOptions
      });

      logger.info(`Created Browserbase session: ${session.id}`);
      return session;
    } catch (error) {
      logger.error('Failed to create Browserbase session:', error);
      throw error;
    }
  }

  /**
   * Get session information
   * @param {string} sessionId - Session ID
   * @returns {Object} Session information
   */
  async getSession(sessionId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * List all sessions
   * @param {Object} filters - Filter options
   * @returns {Array} List of sessions
   */
  async listSessions(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await this.client.get(`/sessions?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to list sessions:', error);
      throw error;
    }
  }

  /**
   * Close a browser session
   * @param {string} sessionId - Session ID
   * @returns {Object} Close result
   */
  async closeSession(sessionId) {
    try {
      const response = await this.client.post(`/sessions/${sessionId}/close`);
      
      // Update local session tracking
      if (this.sessions.has(sessionId)) {
        this.sessions.get(sessionId).status = 'closed';
        this.sessions.get(sessionId).closedAt = new Date();
      }

      logger.info(`Closed Browserbase session: ${sessionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to close session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Create a context for session persistence
   * @param {string} sessionId - Session ID
   * @param {Object} contextData - Context data to store
   * @returns {Object} Context information
   */
  async createContext(sessionId, contextData = {}) {
    try {
      const response = await this.client.post(`/sessions/${sessionId}/contexts`, {
        data: contextData
      });

      logger.info(`Created context for session ${sessionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to create context for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get context data
   * @param {string} sessionId - Session ID
   * @param {string} contextId - Context ID
   * @returns {Object} Context data
   */
  async getContext(sessionId, contextId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}/contexts/${contextId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get context ${contextId} for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update context data
   * @param {string} sessionId - Session ID
   * @param {string} contextId - Context ID
   * @param {Object} contextData - Updated context data
   * @returns {Object} Updated context
   */
  async updateContext(sessionId, contextId, contextData) {
    try {
      const response = await this.client.put(`/sessions/${sessionId}/contexts/${contextId}`, {
        data: contextData
      });

      logger.info(`Updated context ${contextId} for session ${sessionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update context ${contextId} for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete context
   * @param {string} sessionId - Session ID
   * @param {string} contextId - Context ID
   * @returns {Object} Delete result
   */
  async deleteContext(sessionId, contextId) {
    try {
      const response = await this.client.delete(`/sessions/${sessionId}/contexts/${contextId}`);
      
      logger.info(`Deleted context ${contextId} for session ${sessionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to delete context ${contextId} for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session logs
   * @param {string} sessionId - Session ID
   * @param {Object} options - Log options
   * @returns {Array} Session logs
   */
  async getSessionLogs(sessionId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.level) params.append('level', options.level);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const response = await this.client.get(`/sessions/${sessionId}/logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get logs for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session metrics
   * @param {string} sessionId - Session ID
   * @returns {Object} Session metrics
   */
  async getSessionMetrics(sessionId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}/metrics`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get metrics for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Take a screenshot
   * @param {string} sessionId - Session ID
   * @param {Object} options - Screenshot options
   * @returns {Buffer} Screenshot buffer
   */
  async takeScreenshot(sessionId, options = {}) {
    try {
      const response = await this.client.post(`/sessions/${sessionId}/screenshot`, options, {
        responseType: 'arraybuffer'
      });

      logger.info(`Screenshot taken for session ${sessionId}`);
      return Buffer.from(response.data);
    } catch (error) {
      logger.error(`Failed to take screenshot for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session WebSocket URL for real-time communication
   * @param {string} sessionId - Session ID
   * @returns {string} WebSocket URL
   */
  getWebSocketURL(sessionId) {
    return `wss://api.browserbase.com/v1/sessions/${sessionId}/ws`;
  }

  /**
   * Get active sessions count
   * @returns {number} Active sessions count
   */
  getActiveSessionsCount() {
    return Array.from(this.sessions.values()).filter(session => session.status === 'active').length;
  }

  /**
   * Get all tracked sessions
   * @returns {Array} All tracked sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup old sessions
   * @param {number} maxAge - Maximum age in milliseconds
   */
  async cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const now = new Date();
      const sessionsToClose = [];

      for (const [sessionId, session] of this.sessions) {
        const age = now.getTime() - session.createdAt.getTime();
        if (age > maxAge && session.status === 'active') {
          sessionsToClose.push(sessionId);
        }
      }

      await Promise.all(sessionsToClose.map(sessionId => this.closeSession(sessionId)));
      
      logger.info(`Cleaned up ${sessionsToClose.length} old sessions`);
    } catch (error) {
      logger.error('Failed to cleanup old sessions:', error);
      throw error;
    }
  }
}

module.exports = new BrowserbaseService();