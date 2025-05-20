/**
 * Job Queue Service
 *
 * Provides Bull job queue functionality for handling asynchronous tasks
 */
import Bull from 'bull';
import { register } from '../config/monitoring.js';
import { Counter, Histogram } from 'prom-client';
// Redis connection options
const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_JOB_QUEUE_DB) || 1, // Use a different DB than cache
    maxRetriesPerRequest: 5
};
// Default job options
const defaultJobOptions = {
    attempts: 3, // Retry jobs up to 3 times
    backoff: {
        type: 'exponential', // Exponential backoff
        delay: 1000 // Starting delay of 1 second
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200 // Keep last 200 failed jobs
};
// Create job queues
const emailQueue = new Bull('email-notifications', {
    redis: redisOptions,
    defaultJobOptions
});
const reminderQueue = new Bull('settlement-reminders', {
    redis: redisOptions,
    defaultJobOptions
});
const settlementQueue = new Bull('settlement-processing', {
    redis: redisOptions,
    defaultJobOptions
});
// Set up metrics tracking
const setupMetrics = () => {
    // Register metrics for job processing
    const jobProcessingCounter = new Counter({
        name: 'job_processing_total',
        help: 'Count of jobs being processed',
        labelNames: ['queue', 'status']
    });
    const jobDurationHistogram = new Histogram({
        name: 'job_processing_duration_seconds',
        help: 'Duration of job processing',
        labelNames: ['queue', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });
    // Register metrics
    register.registerMetric(jobProcessingCounter);
    register.registerMetric(jobDurationHistogram);
    // Add event listeners to each queue for metrics
    [emailQueue, reminderQueue, settlementQueue].forEach(queue => {
        const queueName = queue.name;
        queue.on('completed', (job) => {
            jobProcessingCounter.inc({ queue: queueName, status: 'success' });
            if (job.finishedOn && job.processedOn) {
                const processingTime = (job.finishedOn - job.processedOn) / 1000;
                jobDurationHistogram.observe({ queue: queueName, status: 'success' }, processingTime);
            }
        });
        queue.on('failed', (job) => {
            jobProcessingCounter.inc({ queue: queueName, status: 'failed' });
            // Only track duration for jobs that were attempted
            if (job.processedOn && job.finishedOn) {
                const processingTime = (job.finishedOn - job.processedOn) / 1000;
                jobDurationHistogram.observe({ queue: queueName, status: 'failed' }, processingTime);
            }
        });
        queue.on('stalled', (jobId) => {
            jobProcessingCounter.inc({ queue: queueName, status: 'stalled' });
            console.warn(`Job ${jobId} in queue ${queueName} has stalled`);
        });
    });
};
// Initialize metrics
setupMetrics();
/**
 * Add a job to send a settlement notification email
 */
export async function addEmailNotificationJob(data, options = {}) {
    return emailQueue.add(data, {
        ...defaultJobOptions,
        ...options
    });
}
/**
 * Add a job to send settlement reminder
 */
export async function addSettlementReminderJob(data, options = {}) {
    return reminderQueue.add(data, {
        ...defaultJobOptions,
        ...options,
        delay: options.delay || 0
    });
}
/**
 * Add a job to process a settlement (e.g., automated settlement tasks)
 */
export async function addSettlementProcessingJob(data, options = {}) {
    return settlementQueue.add(data, {
        ...defaultJobOptions,
        ...options
    });
}
/**
 * Schedule a settlement reminder for a specific date
 */
export async function scheduleSettlementReminder(data, scheduledFor) {
    const now = new Date();
    const targetDate = new Date(scheduledFor);
    const delayMs = Math.max(0, targetDate.getTime() - now.getTime());
    return addSettlementReminderJob(data, { delay: delayMs });
}
/**
 * Get queue health information for monitoring
 */
export async function getQueuesHealth() {
    const [emailCounts, reminderCounts, settlementCounts] = await Promise.all([
        emailQueue.getJobCounts(),
        reminderQueue.getJobCounts(),
        settlementQueue.getJobCounts()
    ]);
    return {
        email: emailCounts,
        reminders: reminderCounts,
        settlement: settlementCounts
    };
}
export { emailQueue, reminderQueue, settlementQueue };
