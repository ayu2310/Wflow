const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
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
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'],
    default: 'pending'
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number, // in milliseconds
  browserSessionId: String, // Browserbase session ID
  logs: [{
    timestamp: Date,
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug']
    },
    message: String,
    data: mongoose.Schema.Types.Mixed
  }],
  results: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  error: {
    message: String,
    stack: String,
    code: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  performance: {
    memoryUsage: Number,
    cpuUsage: Number,
    networkRequests: Number,
    pageLoadTime: Number
  }
}, {
  timestamps: true
});

// Indexes for better query performance
executionSchema.index({ userId: 1, createdAt: -1 });
executionSchema.index({ workflowId: 1, createdAt: -1 });
executionSchema.index({ scheduleId: 1, createdAt: -1 });
executionSchema.index({ status: 1, createdAt: -1 });
executionSchema.index({ browserSessionId: 1 });

// Calculate duration
executionSchema.methods.calculateDuration = function() {
  if (this.startedAt && this.completedAt) {
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  }
  return this.duration;
};

// Add log entry
executionSchema.methods.addLog = function(level, message, data = null) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    data
  });
  return this.save();
};

// Mark as started
executionSchema.methods.markAsStarted = function(browserSessionId = null) {
  this.status = 'running';
  this.startedAt = new Date();
  if (browserSessionId) {
    this.browserSessionId = browserSessionId;
  }
  return this.save();
};

// Mark as completed
executionSchema.methods.markAsCompleted = function(results = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.results = results;
  this.calculateDuration();
  return this.save();
};

// Mark as failed
executionSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.error = {
    message: error.message,
    stack: error.stack,
    code: error.code || 'UNKNOWN_ERROR'
  };
  this.calculateDuration();
  return this.save();
};

module.exports = mongoose.model('Execution', executionSchema);