const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  cronExpression: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  nextRunAt: Date,
  lastRunAt: Date,
  runCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  settings: {
    maxConcurrentRuns: {
      type: Number,
      default: 1
    },
    retryOnFailure: {
      type: Boolean,
      default: true
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    retryDelay: {
      type: Number,
      default: 60000 // 1 minute
    },
    timeout: {
      type: Number,
      default: 300000 // 5 minutes
    }
  },
  notifications: {
    onSuccess: {
      type: Boolean,
      default: false
    },
    onFailure: {
      type: Boolean,
      default: true
    },
    onStart: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
scheduleSchema.index({ userId: 1, createdAt: -1 });
scheduleSchema.index({ workflowId: 1 });
scheduleSchema.index({ isActive: 1, nextRunAt: 1 });
scheduleSchema.index({ cronExpression: 1 });

// Calculate success rate
scheduleSchema.virtual('successRate').get(function() {
  if (this.runCount === 0) return 0;
  return (this.successCount / this.runCount) * 100;
});

// Update run statistics
scheduleSchema.methods.updateRunStats = function(success) {
  this.runCount += 1;
  this.lastRunAt = new Date();
  
  if (success) {
    this.successCount += 1;
  } else {
    this.failureCount += 1;
  }
  
  return this.save();
};

// Get next run time based on cron expression
scheduleSchema.methods.calculateNextRun = function() {
  const cronParser = require('node-cron');
  
  try {
    // This is a simplified calculation - in production, you'd use a proper cron parser
    // like node-cron or cron-parser to calculate the exact next run time
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60000); // Default to 1 minute from now
    this.nextRunAt = nextRun;
    return nextRun;
  } catch (error) {
    throw new Error(`Invalid cron expression: ${this.cronExpression}`);
  }
};

module.exports = mongoose.model('Schedule', scheduleSchema);