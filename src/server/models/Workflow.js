const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  steps: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['act', 'extract', 'observe', 'agent', 'navigate', 'wait', 'condition'],
      required: true
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    order: {
      type: Number,
      required: true
    }
  }],
  settings: {
    timeout: {
      type: Number,
      default: 300000 // 5 minutes
    },
    retries: {
      type: Number,
      default: 3
    },
    headless: {
      type: Boolean,
      default: true
    },
    viewport: {
      width: {
        type: Number,
        default: 1280
      },
      height: {
        type: Number,
        default: 720
      }
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateCategory: {
    type: String,
    enum: ['ecommerce', 'social-media', 'data-extraction', 'form-filling', 'monitoring', 'other']
  },
  version: {
    type: Number,
    default: 1
  },
  lastExecutedAt: Date,
  executionCount: {
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
  }
}, {
  timestamps: true
});

// Indexes for better query performance
workflowSchema.index({ userId: 1, createdAt: -1 });
workflowSchema.index({ isTemplate: 1, templateCategory: 1 });
workflowSchema.index({ tags: 1 });

// Calculate success rate
workflowSchema.virtual('successRate').get(function() {
  if (this.executionCount === 0) return 0;
  return (this.successCount / this.executionCount) * 100;
});

// Update execution statistics
workflowSchema.methods.updateExecutionStats = function(success) {
  this.executionCount += 1;
  this.lastExecutedAt = new Date();
  
  if (success) {
    this.successCount += 1;
  } else {
    this.failureCount += 1;
  }
  
  return this.save();
};

module.exports = mongoose.model('Workflow', workflowSchema);