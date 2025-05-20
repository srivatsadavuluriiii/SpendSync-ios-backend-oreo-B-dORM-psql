/**
 * Job Queue Service
 *
 * Provides Bull job queue functionality for handling asynchronous tasks
 */
import { Queue, Job, JobOptions } from 'bull';
declare const emailQueue: Queue;
declare const reminderQueue: Queue;
declare const settlementQueue: Queue;
export interface EmailNotificationJobData {
    userId: string;
    email: string;
    subject: string;
    templateType: string;
    templateData: Record<string, any>;
}
export interface SettlementReminderJobData {
    settlementId: string;
    userId: string;
    dueDate: Date;
    reminderType: 'initial' | 'followup' | 'final';
}
export interface SettlementProcessingJobData {
    settlementId: string;
    processType: string;
    payload: Record<string, any>;
}
/**
 * Add a job to send a settlement notification email
 */
export declare function addEmailNotificationJob(data: EmailNotificationJobData, options?: JobOptions): Promise<Job>;
/**
 * Add a job to send settlement reminder
 */
export declare function addSettlementReminderJob(data: SettlementReminderJobData, options?: JobOptions): Promise<Job>;
/**
 * Add a job to process a settlement (e.g., automated settlement tasks)
 */
export declare function addSettlementProcessingJob(data: SettlementProcessingJobData, options?: JobOptions): Promise<Job>;
/**
 * Schedule a settlement reminder for a specific date
 */
export declare function scheduleSettlementReminder(data: SettlementReminderJobData, scheduledFor: Date): Promise<Job>;
/**
 * Get queue health information for monitoring
 */
export declare function getQueuesHealth(): Promise<Record<string, any>>;
export { emailQueue, reminderQueue, settlementQueue };
