/**
 * Reminder Processor
 * 
 * Processes settlement reminder jobs from the queue
 */

const { reminderQueue, addEmailNotificationJob } = require('../services/job-queue.service');
const { metrics } = require('../config/monitoring');
const settlementService = require('../services/settlement.service');

// Use a simple logger instead of metrics.registerCounter
const reminderCounter = {
  inc: (labels) => {
    console.log(`Settlement reminder processed: ${JSON.stringify(labels)}`);
  }
};

/**
 * Process a settlement reminder job
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} - Result of the reminder processing
 */
async function processSettlementReminder(job) {
  const { settlementId, userId, dueDate, reminderType } = job.data;
  
  try {
    console.log(`Processing ${reminderType} reminder for settlement ${settlementId}`);
    
    // Get settlement details
    const settlement = await settlementService.getSettlementById(settlementId);
    
    if (!settlement) {
      console.warn(`Settlement ${settlementId} not found for reminder`);
      return { success: false, reason: 'settlement_not_found' };
    }
    
    // Skip if the settlement is already completed or cancelled
    if (settlement.status !== 'pending') {
      console.log(`Settlement ${settlementId} is ${settlement.status}, skipping reminder`);
      return { success: true, status: settlement.status, skipped: true };
    }
    
    // Get user details (in a real app, you would get this from the user service)
    const userEmail = await getUserEmail(userId);
    
    // Send email notification for the reminder
    await sendReminderEmail(userId, userEmail, settlement, reminderType);
    
    // Schedule follow-up reminder if needed
    await scheduleFollowupReminder(settlement, userId, reminderType);
    
    // Record successful reminder
    reminderCounter.inc({ type: reminderType, status: 'success' });
    
    return { 
      success: true, 
      settlementId, 
      userId,
      reminderType,
      sentAt: new Date()
    };
  } catch (error) {
    // Record failed reminder
    reminderCounter.inc({ type: reminderType, status: 'failed' });
    
    console.error(`Failed to process reminder for settlement ${settlementId}:`, error);
    throw error; // Re-throw to let Bull handle the retry
  }
}

/**
 * Get user email (placeholder - would call user service in real app)
 * @param {string} userId - User ID
 * @returns {Promise<string>} - User email
 */
async function getUserEmail(userId) {
  // Simulating a call to get user email
  await new Promise(resolve => setTimeout(resolve, 100));
  return `user_${userId}@example.com`;
}

/**
 * Send a reminder email for a settlement
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {Object} settlement - Settlement details
 * @param {string} reminderType - Type of reminder
 * @returns {Promise<void>}
 */
async function sendReminderEmail(userId, email, settlement, reminderType) {
  // Prepare email notification data based on reminder type
  const emailData = {
    userId,
    email,
    subject: getEmailSubject(reminderType, settlement),
    templateType: `settlement_${reminderType}_reminder`,
    templateData: {
      settlementId: settlement.id,
      amount: settlement.amount,
      currency: settlement.currency,
      dueDate: settlement.dueDate,
      reminderType
    }
  };
  
  // Add email to the queue
  await addEmailNotificationJob(emailData);
}

/**
 * Get the email subject based on reminder type
 * @param {string} reminderType - Type of reminder
 * @param {Object} settlement - Settlement details
 * @returns {string} - Email subject
 */
function getEmailSubject(reminderType, settlement) {
  const subjects = {
    initial: `Reminder: Settlement Payment of ${settlement.amount} ${settlement.currency} Due`,
    followup: `Follow-up Reminder: Your Settlement Payment is Due Soon`,
    final: `Final Reminder: Settlement Payment Due Today`,
    overdue: `Your Settlement Payment is Overdue`
  };
  
  return subjects[reminderType] || `Settlement Reminder: ${settlement.amount} ${settlement.currency}`;
}

/**
 * Schedule follow-up reminders if needed
 * @param {Object} settlement - Settlement details
 * @param {string} userId - User ID
 * @param {string} currentReminderType - Current reminder type
 * @returns {Promise<void>}
 */
async function scheduleFollowupReminder(settlement, userId, currentReminderType) {
  // Parse due date
  const dueDate = new Date(settlement.dueDate || Date.now() + 86400000); // Default to 1 day if no due date
  const now = new Date();
  
  // Different timing strategies based on current reminder type
  if (currentReminderType === 'initial') {
    // Schedule a follow-up reminder for 2 days before due date
    const followupDate = new Date(dueDate);
    followupDate.setDate(followupDate.getDate() - 2);
    
    // Only schedule if the followup date is in the future
    if (followupDate > now) {
      await reminderQueue.add({
        settlementId: settlement.id,
        userId,
        dueDate,
        reminderType: 'followup'
      }, {
        delay: followupDate.getTime() - now.getTime()
      });
    }
    
    // Schedule a final reminder for the due date
    await reminderQueue.add({
      settlementId: settlement.id,
      userId,
      dueDate,
      reminderType: 'final'
    }, {
      delay: dueDate.getTime() - now.getTime()
    });
  } else if (currentReminderType === 'final' && dueDate < now) {
    // If it's past due date after the final reminder, schedule an overdue reminder
    await reminderQueue.add({
      settlementId: settlement.id,
      userId,
      dueDate,
      reminderType: 'overdue'
    }, {
      delay: 86400000 // 1 day later
    });
  }
}

// Register the processor with the queue
reminderQueue.process(processSettlementReminder);

// Handle job completion
reminderQueue.on('completed', (job, result) => {
  console.log(`Reminder job ${job.id} completed with result:`, result);
});

// Handle job failures
reminderQueue.on('failed', (job, error) => {
  console.error(`Reminder job ${job.id} failed with error:`, error);
});

module.exports = {
  processSettlementReminder
}; 