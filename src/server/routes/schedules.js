const express = require('express');
const Joi = require('joi');
const Schedule = require('../models/Schedule');
const Workflow = require('../models/Workflow');
const schedulerService = require('../../automation/scheduler/schedulerService');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const scheduleSchema = Joi.object({
  workflowId: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  cronExpression: Joi.string().required(),
  timezone: Joi.string().default('UTC'),
  settings: Joi.object({
    maxConcurrentRuns: Joi.number().integer().min(1).max(10).optional(),
    retryOnFailure: Joi.boolean().optional(),
    maxRetries: Joi.number().integer().min(0).max(10).optional(),
    retryDelay: Joi.number().integer().min(1000).max(3600000).optional(),
    timeout: Joi.number().integer().min(1000).max(3600000).optional()
  }).optional(),
  notifications: Joi.object({
    onSuccess: Joi.boolean().optional(),
    onFailure: Joi.boolean().optional(),
    onStart: Joi.boolean().optional()
  }).optional(),
  metadata: Joi.object().optional()
});

const updateScheduleSchema = scheduleSchema.fork(['workflowId', 'name', 'cronExpression'], (schema) => schema.optional());

// @route   GET /api/schedules
// @desc    Get user schedules
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { userId };
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Get schedules with pagination
    const schedules = await Schedule.find(query)
      .populate('workflowId', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Schedule.countDocuments(query);

    res.json({
      schedules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get schedules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/schedules/:id
// @desc    Get schedule by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('workflowId', 'name description steps settings');

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ schedule });
  } catch (error) {
    logger.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/schedules
// @desc    Create new schedule
// @access  Private
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = scheduleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Verify workflow ownership
    const workflow = await Workflow.findOne({
      _id: value.workflowId,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create schedule
    const schedule = new Schedule({
      ...value,
      userId: req.user._id
    });

    await schedule.save();

    // Schedule the workflow
    await schedulerService.scheduleWorkflow(schedule);

    logger.info(`Created schedule: ${schedule._id} for user: ${req.user._id}`);

    res.status(201).json({
      message: 'Schedule created successfully',
      schedule
    });
  } catch (error) {
    logger.error('Create schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Update schedule
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateScheduleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Find schedule
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Update schedule
    await schedulerService.updateSchedule(req.params.id, value);

    // Get updated schedule
    const updatedSchedule = await Schedule.findById(req.params.id);

    logger.info(`Updated schedule: ${req.params.id}`);

    res.json({
      message: 'Schedule updated successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    logger.error('Update schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Delete schedule
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await schedulerService.deleteSchedule(req.params.id);

    logger.info(`Deleted schedule: ${req.params.id}`);

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    logger.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/schedules/:id/pause
// @desc    Pause schedule
// @access  Private
router.post('/:id/pause', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const updatedSchedule = await schedulerService.pauseSchedule(req.params.id);

    logger.info(`Paused schedule: ${req.params.id}`);

    res.json({
      message: 'Schedule paused successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    logger.error('Pause schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/schedules/:id/resume
// @desc    Resume schedule
// @access  Private
router.post('/:id/resume', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const updatedSchedule = await schedulerService.resumeSchedule(req.params.id);

    logger.info(`Resumed schedule: ${req.params.id}`);

    res.json({
      message: 'Schedule resumed successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    logger.error('Resume schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/schedules/:id/execute
// @desc    Execute schedule immediately
// @access  Private
router.post('/:id/execute', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const result = await schedulerService.executeNow(req.params.id);

    logger.info(`Executed schedule immediately: ${req.params.id}`);

    res.json({
      message: 'Schedule executed successfully',
      jobId: result.jobId
    });
  } catch (error) {
    logger.error('Execute schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/schedules/:id/executions
// @desc    Get schedule executions
// @access  Private
router.get('/:id/executions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Verify schedule ownership
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Build query
    const query = { scheduleId: req.params.id };
    if (status) {
      query.status = status;
    }

    // Get executions with pagination
    const executions = await require('../models/Execution').find(query)
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await require('../models/Execution').countDocuments(query);

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
    logger.error('Get schedule executions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/schedules/queue/stats
// @desc    Get queue statistics
// @access  Private
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await schedulerService.getQueueStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Get queue stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;