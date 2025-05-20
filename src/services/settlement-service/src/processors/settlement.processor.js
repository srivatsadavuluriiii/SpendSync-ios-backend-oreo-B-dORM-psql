/**
 * Settlement Processor
 * 
 * Processes settlement-related background jobs
 */

const { settlementQueue, addEmailNotificationJob } = require('../services/job-queue.service');
const { metrics } = require('../config/monitoring');
const settlementService = require('../services/settlement.service');
const paymentService = require('../services/payment.service');

// Use a simple logger instead of metrics.registerCounter
const settlementJobCounter = {
  inc: (labels) => {
    console.log(`Settlement job processed: ${JSON.stringify(labels)}`);
  }
};

/**
 * Process a settlement job
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} - Result of the settlement processing
 */
async function processSettlementJob(job) {
  const { settlementId, processType, payload } = job.data;
  
  try {
    console.log(`Processing ${processType} job for settlement ${settlementId}`);
    
    // Record the start of job processing
    settlementJobCounter.inc({ type: processType, status: 'processing' });
    
    // Process based on job type
    let result;
    
    switch (processType) {
      case 'auto_complete':
        result = await autoCompleteSettlement(settlementId);
        break;
      case 'payment_status_check':
        result = await checkPaymentStatus(settlementId);
        break;
      case 'settlement_notification':
        result = await sendSettlementNotification(settlementId, payload);
        break;
      case 'periodic_reminder':
        result = await schedulePeriodicReminders(settlementId);
        break;
      default:
        throw new Error(`Unknown process type: ${processType}`);
    }
    
    // Record successful processing
    settlementJobCounter.inc({ type: processType, status: 'success' });
    
    return {
      success: true,
      settlementId,
      processType,
      result
    };
  } catch (error) {
    // Record failed processing
    settlementJobCounter.inc({ type: processType, status: 'failed' });
    
    console.error(`Failed to process ${processType} job for settlement ${settlementId}:`, error);
    throw error;
  }
}

/**
 * Auto-complete a settlement after verifying its status
 * @param {string} settlementId - Settlement ID
 * @returns {Promise<Object>} - Result of the auto-completion
 */
async function autoCompleteSettlement(settlementId) {
  // Get settlement details
  const settlement = await settlementService.getSettlementById(settlementId);
  
  if (!settlement) {
    throw new Error(`Settlement ${settlementId} not found`);
  }
  
  // Only process pending settlements
  if (settlement.status !== 'pending') {
    return {
      skipped: true,
      reason: `Settlement is ${settlement.status}`,
      status: settlement.status
    };
  }
  
  // Check payment status if payment method is used
  if (settlement.paymentMethodId) {
    const paymentStatus = await paymentService.getPaymentStatus(settlement.paymentId);
    
    if (paymentStatus !== 'succeeded') {
      return {
        skipped: true,
        reason: `Payment status is ${paymentStatus}`,
        paymentStatus
      };
    }
  }
  
  // Complete the settlement
  const updatedSettlement = await settlementService.updateSettlementStatus(
    settlementId,
    'completed',
    { completedAt: new Date() }
  );
  
  // Notify users about completion
  await Promise.all([
    notifyUser(settlement.payerId, 'payment_sent', settlement),
    notifyUser(settlement.receiverId, 'payment_received', settlement)
  ]);
  
  return {
    completed: true,
    settlement: updatedSettlement
  };
}

/**
 * Check the payment status for a settlement with an associated payment
 * @param {string} settlementId - Settlement ID
 * @returns {Promise<Object>} - Result of the payment status check
 */
async function checkPaymentStatus(settlementId) {
  // Get settlement details
  const settlement = await settlementService.getSettlementById(settlementId);
  
  if (!settlement || !settlement.paymentId) {
    return {
      skipped: true,
      reason: settlement ? 'No payment ID associated' : 'Settlement not found'
    };
  }
  
  // Only check pending settlements
  if (settlement.status !== 'pending') {
    return {
      skipped: true,
      reason: `Settlement is ${settlement.status}`
    };
  }
  
  // Check payment status
  const paymentStatus = await paymentService.getPaymentStatus(settlement.paymentId);
  
  // If payment succeeded, update settlement status
  if (paymentStatus === 'succeeded') {
    const updatedSettlement = await settlementService.updateSettlementStatus(
      settlementId,
      'completed',
      { completedAt: new Date() }
    );
    
    // Notify users about completion
    await Promise.all([
      notifyUser(settlement.payerId, 'payment_confirmed', settlement),
      notifyUser(settlement.receiverId, 'payment_received', settlement)
    ]);
    
    return {
      updated: true,
      status: 'completed',
      paymentStatus
    };
  }
  
  // If payment failed, update settlement
  if (paymentStatus === 'failed') {
    await settlementService.updatePaymentStatus(settlementId, 'failed', {
      paymentError: 'Payment processing failed'
    });
    
    // Notify payer about the failure
    await notifyUser(settlement.payerId, 'payment_failed', settlement);
    
    return {
      updated: true,
      status: 'pending',
      paymentStatus
    };
  }
  
  // For other statuses, just return current status
  return {
    updated: false,
    status: settlement.status,
    paymentStatus
  };
}

/**
 * Send a notification about a settlement
 * @param {string} settlementId - Settlement ID
 * @param {Object} payload - Notification payload
 * @returns {Promise<Object>} - Result of sending the notification
 */
async function sendSettlementNotification(settlementId, payload) {
  const { notificationType, recipientIds } = payload;
  
  // Get settlement details
  const settlement = await settlementService.getSettlementById(settlementId);
  
  if (!settlement) {
    throw new Error(`Settlement ${settlementId} not found`);
  }
  
  // Determine recipients
  const recipients = recipientIds || [settlement.payerId, settlement.receiverId];
  
  // Send notification to each recipient
  const notificationResults = await Promise.all(
    recipients.map(userId => notifyUser(userId, notificationType, settlement))
  );
  
  return {
    notificationType,
    recipientCount: notificationResults.length,
    recipients: notificationResults
  };
}

/**
 * Schedule periodic reminders for a settlement
 * @param {string} settlementId - Settlement ID
 * @returns {Promise<Object>} - Result of scheduling reminders
 */
async function schedulePeriodicReminders(settlementId) {
  // Get settlement details
  const settlement = await settlementService.getSettlementById(settlementId);
  
  if (!settlement) {
    throw new Error(`Settlement ${settlementId} not found`);
  }
  
  // Only schedule reminders for pending settlements
  if (settlement.status !== 'pending') {
    return {
      skipped: true,
      reason: `Settlement is ${settlement.status}`
    };
  }
  
  // Set due date (default to 7 days from now if not set)
  const dueDate = settlement.dueDate 
    ? new Date(settlement.dueDate) 
    : new Date(Date.now() + 7 * 86400000);
  
  // Schedule initial reminder
  await settlementQueue.add({
    settlementId,
    userId: settlement.payerId,
    dueDate,
    reminderType: 'initial'
  }, {
    delay: 0 // Send immediately
  });
  
  return {
    scheduled: true,
    dueDate,
    settlement: {
      id: settlement.id,
      status: settlement.status
    }
  };
}

/**
 * Notify a user about a settlement event
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {Object} settlement - Settlement details
 * @returns {Promise<Object>} - Result of the notification
 */
async function notifyUser(userId, notificationType, settlement) {
  // Get user email (would call user service in real app)
  const userEmail = `user_${userId}@example.com`;
  
  // Prepare subject based on notification type
  const subjects = {
    payment_sent: `Your payment of ${settlement.amount} ${settlement.currency} has been sent`,
    payment_received: `You have received ${settlement.amount} ${settlement.currency}`,
    payment_confirmed: `Your payment of ${settlement.amount} ${settlement.currency} is confirmed`,
    payment_failed: `Your payment of ${settlement.amount} ${settlement.currency} has failed`,
    settlement_created: `New settlement: ${settlement.amount} ${settlement.currency}`,
    settlement_updated: `Settlement updated: ${settlement.amount} ${settlement.currency}`
  };
  
  const subject = subjects[notificationType] || `Settlement notification: ${settlement.amount} ${settlement.currency}`;
  
  // Add email notification to queue
  await addEmailNotificationJob({
    userId,
    email: userEmail,
    subject,
    templateType: `settlement_${notificationType}`,
    templateData: {
      settlementId: settlement.id,
      amount: settlement.amount,
      currency: settlement.currency,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
      status: settlement.status
    }
  });
  
  return {
    userId,
    notificationType,
    success: true
  };
}

// Register the processor with the queue
settlementQueue.process(processSettlementJob);

// Handle job completion
settlementQueue.on('completed', (job, result) => {
  console.log(`Settlement job ${job.id} completed with result:`, result);
});

// Handle job failures
settlementQueue.on('failed', (job, error) => {
  console.error(`Settlement job ${job.id} failed with error:`, error);
});

module.exports = {
  processSettlementJob
}; 