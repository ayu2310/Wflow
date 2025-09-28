const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  settings: Joi.object({
    timezone: Joi.string().optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      inApp: Joi.boolean().optional()
    }).optional()
  }).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({ user });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    Object.assign(user, value);
    await user.save();

    logger.info(`Updated user profile: ${user._id}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscription: user.subscription,
        settings: user.settings,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', async (req, res) => {
  try {
    // Validate input
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { currentPassword, newPassword } = value;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Changed password for user: ${user._id}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get workflow count
    const workflowCount = await require('../models/Workflow').countDocuments({ userId });

    // Get schedule count
    const scheduleCount = await require('../models/Schedule').countDocuments({ userId });

    // Get execution count
    const executionCount = await require('../models/Execution').countDocuments({ userId });

    // Get recent executions
    const recentExecutions = await require('../models/Execution').find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('workflowId', 'name')
      .populate('scheduleId', 'name')
      .lean();

    // Get execution statistics
    const executionStats = await require('../models/Execution').aggregate([
      {
        $match: { userId }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      workflows: workflowCount,
      schedules: scheduleCount,
      executions: executionCount,
      recentExecutions,
      executionBreakdown: executionStats
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user data
    await Promise.all([
      require('../models/Workflow').deleteMany({ userId }),
      require('../models/Schedule').deleteMany({ userId }),
      require('../models/Execution').deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    logger.info(`Deleted user account: ${userId}`);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;