const express = require('express');
const Joi = require('joi');
const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const workflowExecutionEngine = require('../../automation/workflows/workflowExecutionEngine');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const workflowSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  steps: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('act', 'extract', 'observe', 'agent', 'navigate', 'wait', 'condition').required(),
      config: Joi.object().required(),
      order: Joi.number().integer().min(0).required()
    })
  ).min(1).required(),
  settings: Joi.object({
    timeout: Joi.number().integer().min(1000).max(3600000).optional(),
    retries: Joi.number().integer().min(0).max(10).optional(),
    headless: Joi.boolean().optional(),
    viewport: Joi.object({
      width: Joi.number().integer().min(320).max(3840).optional(),
      height: Joi.number().integer().min(240).max(2160).optional()
    }).optional()
  }).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
});

const updateWorkflowSchema = workflowSchema.fork(['name', 'steps'], (schema) => schema.optional());

// @route   GET /api/workflows
// @desc    Get user workflows
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tags, isTemplate } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { userId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }
    
    if (isTemplate !== undefined) {
      query.isTemplate = isTemplate === 'true';
    }

    // Execute query with pagination
    const workflows = await Workflow.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Workflow.countDocuments(query);

    res.json({
      workflows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get workflows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/workflows/:id
// @desc    Get workflow by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow });
  } catch (error) {
    logger.error('Get workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/workflows
// @desc    Create new workflow
// @access  Private
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = workflowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Create workflow
    const workflow = new Workflow({
      ...value,
      userId: req.user._id
    });

    await workflow.save();

    logger.info(`Created workflow: ${workflow._id} for user: ${req.user._id}`);

    res.status(201).json({
      message: 'Workflow created successfully',
      workflow
    });
  } catch (error) {
    logger.error('Create workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   PUT /api/workflows/:id
// @desc    Update workflow
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateWorkflowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Find workflow
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Update workflow
    Object.assign(workflow, value);
    workflow.version += 1;
    await workflow.save();

    logger.info(`Updated workflow: ${workflow._id}`);

    res.json({
      message: 'Workflow updated successfully',
      workflow
    });
  } catch (error) {
    logger.error('Update workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   DELETE /api/workflows/:id
// @desc    Delete workflow
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await Workflow.findByIdAndDelete(req.params.id);

    logger.info(`Deleted workflow: ${req.params.id}`);

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    logger.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/workflows/:id/execute
// @desc    Execute workflow immediately
// @access  Private
router.post('/:id/execute', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create execution record
    const execution = new Execution({
      userId: req.user._id,
      workflowId: workflow._id,
      status: 'pending',
      metadata: {
        manualExecution: true,
        executedBy: req.user._id
      }
    });

    await execution.save();

    // Execute workflow asynchronously
    workflowExecutionEngine.executeWorkflow(workflow, execution, {
      timezone: req.user.settings.timezone || 'UTC'
    }).catch(error => {
      logger.error(`Workflow execution failed: ${execution._id}`, error);
    });

    res.json({
      message: 'Workflow execution started',
      executionId: execution._id
    });
  } catch (error) {
    logger.error('Execute workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/workflows/:id/executions
// @desc    Get workflow executions
// @access  Private
router.get('/:id/executions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Verify workflow ownership
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Build query
    const query = { workflowId: req.params.id };
    if (status) {
      query.status = status;
    }

    // Get executions with pagination
    const executions = await Execution.find(query)
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
    logger.error('Get workflow executions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/workflows/templates/categories
// @desc    Get workflow template categories
// @access  Private
router.get('/templates/categories', async (req, res) => {
  try {
    const categories = await Workflow.distinct('templateCategory', {
      isTemplate: true
    });

    res.json({ categories });
  } catch (error) {
    logger.error('Get template categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/workflows/templates
// @desc    Get workflow templates
// @access  Private
router.get('/templates', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { isTemplate: true };
    if (category) {
      query.templateCategory = category;
    }

    // Get templates with pagination
    const templates = await Workflow.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Workflow.countDocuments(query);

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/workflows/templates/:id/clone
// @desc    Clone a template workflow
// @access  Private
router.post('/templates/:id/clone', async (req, res) => {
  try {
    const template = await Workflow.findOne({
      _id: req.params.id,
      isTemplate: true
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Clone template
    const workflow = new Workflow({
      name: `${template.name} (Copy)`,
      description: template.description,
      steps: template.steps,
      settings: template.settings,
      tags: template.tags,
      userId: req.user._id,
      isTemplate: false
    });

    await workflow.save();

    logger.info(`Cloned template: ${template._id} to workflow: ${workflow._id}`);

    res.status(201).json({
      message: 'Template cloned successfully',
      workflow
    });
  } catch (error) {
    logger.error('Clone template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;