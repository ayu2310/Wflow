const Queue = require('bull');
const cronParser = require('cron-parser');
const Schedule = require('../../server/models/Schedule');
const Workflow = require('../../server/models/Workflow');
const Execution = require('../../server/models/Execution');
const workflowExecutionEngine = require('./workflowExecutionEngine');
const logger = require('../../server/utils/logger');

class SchedulerService {
  constructor() {
    this.queue = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the scheduler service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      // Create Bull queue
      this.queue = new Queue('workflow-scheduler', process.env.REDIS_URL);

      // Process jobs
      this.queue.process('execute-workflow', this.processWorkflowJob.bind(this));

      // Event handlers
      this.queue.on('completed', (job) => {
        logger.info(`Job completed: ${job.id}`);
      });

      this.queue.on('failed', (job, err) => {
        logger.error(`Job failed: ${job.id}`, err);
      });

      this.queue.on('stalled', (job) => {
        logger.warn(`Job stalled: ${job.id}`);
      });

      // Load existing schedules
      await this.loadExistingSchedules();

      // Start schedule monitoring
      this.startScheduleMonitoring();

      this.isInitialized = true;
      logger.info('Scheduler service initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler service:', error);
      throw error;
    }
  }

  /**
   * Load existing active schedules from database
   */
  async loadExistingSchedules() {
    try {
      const schedules = await Schedule.find({ isActive: true });
      
      for (const schedule of schedules) {
        await this.scheduleWorkflow(schedule);
      }

      logger.info(`Loaded ${schedules.length} existing schedules`);
    } catch (error) {
      logger.error('Failed to load existing schedules:', error);
      throw error;
    }
  }

  /**
   * Schedule a workflow for execution
   * @param {Object} schedule - Schedule object
   * @returns {Object} Scheduled job
   */
  async scheduleWorkflow(schedule) {
    try {
      // Calculate next run time
      const nextRun = this.calculateNextRun(schedule.cronExpression, schedule.timezone);
      
      if (!nextRun) {
        throw new Error(`Invalid cron expression: ${schedule.cronExpression}`);
      }

      // Update schedule with next run time
      schedule.nextRunAt = nextRun;
      await schedule.save();

      // Create job options
      const jobOptions = {
        jobId: schedule._id.toString(),
        delay: nextRun.getTime() - Date.now(),
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: schedule.settings.maxRetries || 3,
        backoff: {
          type: 'exponential',
          delay: schedule.settings.retryDelay || 60000
        }
      };

      // Add job to queue
      const job = await this.queue.add('execute-workflow', {
        scheduleId: schedule._id,
        workflowId: schedule.workflowId,
        userId: schedule.userId,
        metadata: schedule.metadata
      }, jobOptions);

      logger.info(`Scheduled workflow: ${schedule._id} for ${nextRun.toISOString()}`);
      
      return job;
    } catch (error) {
      logger.error(`Failed to schedule workflow ${schedule._id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate next run time based on cron expression
   * @param {string} cronExpression - Cron expression
   * @param {string} timezone - Timezone
   * @returns {Date|null} Next run time
   */
  calculateNextRun(cronExpression, timezone = 'UTC') {
    try {
      const options = {
        currentDate: new Date(),
        tz: timezone
      };

      const interval = cronParser.parseExpression(cronExpression, options);
      return interval.next().toDate();
    } catch (error) {
      logger.error(`Invalid cron expression: ${cronExpression}`, error);
      return null;
    }
  }

  /**
   * Process workflow job
   * @param {Object} job - Bull job
   * @returns {Object} Job result
   */
  async processWorkflowJob(job) {
    const { scheduleId, workflowId, userId, metadata } = job.data;
    
    try {
      logger.info(`Processing workflow job: ${job.id}`);

      // Get schedule and workflow
      const schedule = await Schedule.findById(scheduleId);
      const workflow = await Workflow.findById(workflowId);

      if (!schedule || !workflow) {
        throw new Error('Schedule or workflow not found');
      }

      if (!schedule.isActive) {
        throw new Error('Schedule is not active');
      }

      // Create execution record
      const execution = new Execution({
        userId,
        workflowId,
        scheduleId,
        status: 'pending',
        metadata: {
          ...metadata,
          scheduledExecution: true,
          jobId: job.id
        }
      });

      await execution.save();

      // Execute workflow
      const result = await workflowExecutionEngine.executeWorkflow(
        workflow,
        execution,
        {
          timezone: schedule.timezone,
          maxRetries: schedule.settings.maxRetries,
          timeout: schedule.settings.timeout
        }
      );

      // Update schedule statistics
      await schedule.updateRunStats(result.success);

      // Schedule next run
      if (schedule.isActive) {
        await this.scheduleWorkflow(schedule);
      }

      // Send notifications if configured
      if (schedule.notifications) {
        await this.sendNotifications(schedule, execution, result);
      }

      logger.info(`Workflow job completed: ${job.id}`);
      
      return result;

    } catch (error) {
      logger.error(`Workflow job failed: ${job.id}`, error);
      
      // Update schedule failure count
      try {
        const schedule = await Schedule.findById(scheduleId);
        if (schedule) {
          await schedule.updateRunStats(false);
        }
      } catch (updateError) {
        logger.error('Failed to update schedule failure count:', updateError);
      }

      throw error;
    }
  }

  /**
   * Create a new schedule
   * @param {Object} scheduleData - Schedule data
   * @returns {Object} Created schedule
   */
  async createSchedule(scheduleData) {
    try {
      // Validate cron expression
      const nextRun = this.calculateNextRun(scheduleData.cronExpression, scheduleData.timezone);
      if (!nextRun) {
        throw new Error(`Invalid cron expression: ${scheduleData.cronExpression}`);
      }

      // Create schedule
      const schedule = new Schedule(scheduleData);
      await schedule.save();

      // Schedule the workflow
      await this.scheduleWorkflow(schedule);

      logger.info(`Created schedule: ${schedule._id}`);
      
      return schedule;
    } catch (error) {
      logger.error('Failed to create schedule:', error);
      throw error;
    }
  }

  /**
   * Update an existing schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated schedule
   */
  async updateSchedule(scheduleId, updateData) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Remove existing job if cron expression changed
      if (updateData.cronExpression && updateData.cronExpression !== schedule.cronExpression) {
        await this.queue.removeJobs(scheduleId);
      }

      // Update schedule
      Object.assign(schedule, updateData);
      await schedule.save();

      // Reschedule if active
      if (schedule.isActive) {
        await this.scheduleWorkflow(schedule);
      }

      logger.info(`Updated schedule: ${scheduleId}`);
      
      return schedule;
    } catch (error) {
      logger.error(`Failed to update schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {boolean} Success status
   */
  async deleteSchedule(scheduleId) {
    try {
      // Remove job from queue
      await this.queue.removeJobs(scheduleId);

      // Delete schedule from database
      await Schedule.findByIdAndDelete(scheduleId);

      logger.info(`Deleted schedule: ${scheduleId}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Pause a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Updated schedule
   */
  async pauseSchedule(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      schedule.isActive = false;
      await schedule.save();

      // Remove job from queue
      await this.queue.removeJobs(scheduleId);

      logger.info(`Paused schedule: ${scheduleId}`);
      
      return schedule;
    } catch (error) {
      logger.error(`Failed to pause schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Updated schedule
   */
  async resumeSchedule(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      schedule.isActive = true;
      await schedule.save();

      // Reschedule the workflow
      await this.scheduleWorkflow(schedule);

      logger.info(`Resumed schedule: ${scheduleId}`);
      
      return schedule;
    } catch (error) {
      logger.error(`Failed to resume schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a workflow immediately
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Execution result
   */
  async executeNow(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Add immediate execution job
      const job = await this.queue.add('execute-workflow', {
        scheduleId: schedule._id,
        workflowId: schedule.workflowId,
        userId: schedule.userId,
        metadata: { ...schedule.metadata, immediateExecution: true }
      }, {
        priority: 1, // High priority
        removeOnComplete: 10,
        removeOnFail: 5
      });

      logger.info(`Scheduled immediate execution: ${scheduleId}`);
      
      return { jobId: job.id };
    } catch (error) {
      logger.error(`Failed to execute schedule ${scheduleId} now:`, error);
      throw error;
    }
  }

  /**
   * Send notifications
   * @param {Object} schedule - Schedule object
   * @param {Object} execution - Execution object
   * @param {Object} result - Execution result
   */
  async sendNotifications(schedule, execution, result) {
    try {
      // This is a placeholder for notification logic
      // In production, you'd integrate with email services, webhooks, etc.
      
      if (result.success && schedule.notifications.onSuccess) {
        logger.info(`Success notification for schedule: ${schedule._id}`);
        // Send success notification
      }

      if (!result.success && schedule.notifications.onFailure) {
        logger.info(`Failure notification for schedule: ${schedule._id}`);
        // Send failure notification
      }
    } catch (error) {
      logger.error('Failed to send notifications:', error);
    }
  }

  /**
   * Start schedule monitoring
   */
  startScheduleMonitoring() {
    // Monitor schedules every minute
    setInterval(async () => {
      try {
        await this.monitorSchedules();
      } catch (error) {
        logger.error('Schedule monitoring error:', error);
      }
    }, 60000); // 1 minute
  }

  /**
   * Monitor schedules for updates
   */
  async monitorSchedules() {
    try {
      // Check for schedules that need to be rescheduled
      const schedules = await Schedule.find({
        isActive: true,
        nextRunAt: { $lt: new Date() }
      });

      for (const schedule of schedules) {
        await this.scheduleWorkflow(schedule);
      }
    } catch (error) {
      logger.error('Schedule monitoring failed:', error);
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  async getQueueStats() {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Shutdown scheduler service
   */
  async shutdown() {
    try {
      if (this.queue) {
        await this.queue.close();
      }
      logger.info('Scheduler service shutdown');
    } catch (error) {
      logger.error('Failed to shutdown scheduler service:', error);
      throw error;
    }
  }
}

module.exports = new SchedulerService();