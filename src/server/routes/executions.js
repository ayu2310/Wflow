const express = require('express');
const Execution = require('../models/Execution');
const Workflow = require('../models/Workflow');
const Schedule = require('../models/Schedule');
const workflowExecutionEngine = require('../../automation/workflows/workflowExecutionEngine');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/executions
// @desc    Get user executions
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, workflowId, scheduleId } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (workflowId) {
      query.workflowId = workflowId;
    }
    
    if (scheduleId) {
      query.scheduleId = scheduleId;
    }

    // Get executions with pagination
    const executions = await Execution.find(query)
      .populate('workflowId', 'name description')
      .populate('scheduleId', 'name cronExpression')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Execution.countDocuments(query);

    res.json({
      executions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get executions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/executions/:id
// @desc    Get execution by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const execution = await Execution.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('workflowId', 'name description steps settings')
      .populate('scheduleId', 'name cronExpression timezone');

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ execution });
  } catch (error) {
    logger.error('Get execution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/executions/:id/cancel
// @desc    Cancel execution
// @access  Private
router.post('/:id/cancel', async (req, res) => {
  try {
    const execution = await Execution.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
      return res.status(400).json({ error: 'Execution cannot be cancelled' });
    }

    const cancelled = await workflowExecutionEngine.cancelExecution(req.params.id);

    if (!cancelled) {
      return res.status(400).json({ error: 'Failed to cancel execution' });
    }

    logger.info(`Cancelled execution: ${req.params.id}`);

    res.json({ message: 'Execution cancelled successfully' });
  } catch (error) {
    logger.error('Cancel execution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/executions/:id/retry
// @desc    Retry failed execution
// @access  Private
router.post('/:id/retry', async (req, res) => {
  try {
    const execution = await Execution.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('workflowId');

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (execution.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed executions can be retried' });
    }

    // Create new execution record
    const newExecution = new Execution({
      userId: req.user._id,
      workflowId: execution.workflowId._id,
      scheduleId: execution.scheduleId,
      status: 'pending',
      metadata: {
        ...execution.metadata,
        retryOf: execution._id,
        retryCount: (execution.metadata.retryCount || 0) + 1
      }
    });

    await newExecution.save();

    // Execute workflow asynchronously
    workflowExecutionEngine.executeWorkflow(
      execution.workflowId,
      newExecution,
      {
        timezone: req.user.settings.timezone || 'UTC'
      }
    ).catch(error => {
      logger.error(`Retry execution failed: ${newExecution._id}`, error);
    });

    logger.info(`Retrying execution: ${req.params.id} as ${newExecution._id}`);

    res.json({
      message: 'Execution retry started',
      executionId: newExecution._id
    });
  } catch (error) {
    logger.error('Retry execution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/executions/:id/logs
// @desc    Get execution logs
// @access  Private
router.get('/:id/logs', async (req, res) => {
  try {
    const execution = await Execution.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('logs');

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ logs: execution.logs });
  } catch (error) {
    logger.error('Get execution logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/executions/:id/status
// @desc    Get execution status
// @access  Private
router.get('/:id/status', async (req, res) => {
  try {
    const execution = await Execution.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('status startedAt completedAt duration');

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Get real-time status if execution is active
    let status = {
      executionId: execution._id,
      status: execution.status,
      duration: execution.duration,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt
    };

    if (execution.status === 'running') {
      const realTimeStatus = workflowExecutionEngine.getExecutionStatus(execution._id.toString());
      if (realTimeStatus) {
        status = { ...status, ...realTimeStatus };
      }
    }

    res.json({ status });
  } catch (error) {
    logger.error('Get execution status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/executions/stats/summary
// @desc    Get execution statistics summary
// @access  Private
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get execution statistics
    const stats = await Execution.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Get total counts
    const totalExecutions = await Execution.countDocuments({
      userId,
      createdAt: { $gte: startDate }
    });

    const successfulExecutions = await Execution.countDocuments({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate }
    });

    const failedExecutions = await Execution.countDocuments({
      userId,
      status: 'failed',
      createdAt: { $gte: startDate }
    });

    // Calculate success rate
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    res.json({
      summary: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: Math.round(successRate * 100) / 100,
        period
      },
      statusBreakdown: stats
    });
  } catch (error) {
    logger.error('Get execution stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;