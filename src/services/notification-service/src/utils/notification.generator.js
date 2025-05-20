/**
 * Notification Generator
 * 
 * Utility to generate standardized notifications for different events
 * in the application.
 */

/**
 * Notification types
 * @enum {string}
 */
const NOTIFICATION_TYPES = {
  // Expense related
  EXPENSE_ADDED: 'EXPENSE_ADDED',
  EXPENSE_UPDATED: 'EXPENSE_UPDATED',
  EXPENSE_DELETED: 'EXPENSE_DELETED',
  
  // Settlement related
  SETTLEMENT_REQUESTED: 'SETTLEMENT_REQUESTED',
  SETTLEMENT_COMPLETED: 'SETTLEMENT_COMPLETED',
  SETTLEMENT_REJECTED: 'SETTLEMENT_REJECTED',
  
  // Group related
  GROUP_CREATED: 'GROUP_CREATED',
  GROUP_INVITATION: 'GROUP_INVITATION',
  GROUP_JOINED: 'GROUP_JOINED',
  GROUP_LEFT: 'GROUP_LEFT',
  
  // Friend related
  FRIEND_REQUEST: 'FRIEND_REQUEST',
  FRIEND_ACCEPTED: 'FRIEND_ACCEPTED',
  
  // System related
  ACCOUNT_ALERT: 'ACCOUNT_ALERT',
  PAYMENT_REMINDER: 'PAYMENT_REMINDER'
};

/**
 * Generate a notification object
 * @param {string} userId - Target user ID
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} [metadata={}] - Additional metadata
 * @returns {Object} Notification object
 */
const generateNotification = (userId, type, title, message, metadata = {}) => {
  return {
    userId,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...metadata
  };
};

/**
 * Generate an expense notification
 * @param {Object} options - Options
 * @param {string} options.userId - Target user ID
 * @param {Object} options.expense - Expense data
 * @param {Object} options.creator - User who created the expense
 * @param {string} options.action - Action type ('added', 'updated', 'deleted')
 * @returns {Object} Notification object
 */
const generateExpenseNotification = ({ userId, expense, creator, action }) => {
  let type, title, message;
  
  switch (action) {
    case 'added':
      type = NOTIFICATION_TYPES.EXPENSE_ADDED;
      title = 'New expense added';
      message = `${creator.name} added a new expense of ${expense.currency}${expense.amount.toFixed(2)} in "${expense.groupName}"`;
      break;
    case 'updated':
      type = NOTIFICATION_TYPES.EXPENSE_UPDATED;
      title = 'Expense updated';
      message = `${creator.name} updated an expense in "${expense.groupName}"`;
      break;
    case 'deleted':
      type = NOTIFICATION_TYPES.EXPENSE_DELETED;
      title = 'Expense deleted';
      message = `${creator.name} deleted an expense in "${expense.groupName}"`;
      break;
    default:
      throw new Error(`Invalid expense action: ${action}`);
  }
  
  return generateNotification(userId, type, title, message, {
    relatedEntityId: expense.id,
    relatedEntityType: 'expense',
    groupId: expense.groupId
  });
};

/**
 * Generate a settlement notification
 * @param {Object} options - Options
 * @param {string} options.userId - Target user ID
 * @param {Object} options.settlement - Settlement data
 * @param {Object} options.initiator - User who initiated the action
 * @param {string} options.action - Action type ('requested', 'completed', 'rejected')
 * @returns {Object} Notification object
 */
const generateSettlementNotification = ({ userId, settlement, initiator, action }) => {
  let type, title, message;
  
  switch (action) {
    case 'requested':
      type = NOTIFICATION_TYPES.SETTLEMENT_REQUESTED;
      title = 'Settlement requested';
      message = `${initiator.name} requested a payment of ${settlement.currency}${settlement.amount.toFixed(2)}`;
      break;
    case 'completed':
      type = NOTIFICATION_TYPES.SETTLEMENT_COMPLETED;
      title = 'Settlement completed';
      message = `${initiator.name} marked a payment of ${settlement.currency}${settlement.amount.toFixed(2)} as completed`;
      break;
    case 'rejected':
      type = NOTIFICATION_TYPES.SETTLEMENT_REJECTED;
      title = 'Settlement rejected';
      message = `${initiator.name} rejected a settlement of ${settlement.currency}${settlement.amount.toFixed(2)}`;
      break;
    default:
      throw new Error(`Invalid settlement action: ${action}`);
  }
  
  return generateNotification(userId, type, title, message, {
    relatedEntityId: settlement.id,
    relatedEntityType: 'settlement',
    groupId: settlement.groupId
  });
};

/**
 * Generate a group notification
 * @param {Object} options - Options
 * @param {string} options.userId - Target user ID
 * @param {Object} options.group - Group data
 * @param {Object} options.initiator - User who initiated the action
 * @param {string} options.action - Action type ('created', 'invitation', 'joined', 'left')
 * @returns {Object} Notification object
 */
const generateGroupNotification = ({ userId, group, initiator, action }) => {
  let type, title, message;
  
  switch (action) {
    case 'created':
      type = NOTIFICATION_TYPES.GROUP_CREATED;
      title = 'Group created';
      message = `${initiator.name} created a new group "${group.name}"`;
      break;
    case 'invitation':
      type = NOTIFICATION_TYPES.GROUP_INVITATION;
      title = 'Group invitation';
      message = `${initiator.name} invited you to join "${group.name}"`;
      break;
    case 'joined':
      type = NOTIFICATION_TYPES.GROUP_JOINED;
      title = 'New group member';
      message = `${initiator.name} joined "${group.name}"`;
      break;
    case 'left':
      type = NOTIFICATION_TYPES.GROUP_LEFT;
      title = 'Member left group';
      message = `${initiator.name} left "${group.name}"`;
      break;
    default:
      throw new Error(`Invalid group action: ${action}`);
  }
  
  return generateNotification(userId, type, title, message, {
    relatedEntityId: group.id,
    relatedEntityType: 'group'
  });
};

/**
 * Generate a friend notification
 * @param {Object} options - Options
 * @param {string} options.userId - Target user ID
 * @param {Object} options.friend - Friend user data
 * @param {string} options.action - Action type ('request', 'accepted')
 * @returns {Object} Notification object
 */
const generateFriendNotification = ({ userId, friend, action }) => {
  let type, title, message;
  
  switch (action) {
    case 'request':
      type = NOTIFICATION_TYPES.FRIEND_REQUEST;
      title = 'Friend request';
      message = `${friend.name} sent you a friend request`;
      break;
    case 'accepted':
      type = NOTIFICATION_TYPES.FRIEND_ACCEPTED;
      title = 'Friend request accepted';
      message = `${friend.name} accepted your friend request`;
      break;
    default:
      throw new Error(`Invalid friend action: ${action}`);
  }
  
  return generateNotification(userId, type, title, message, {
    relatedEntityId: friend.id,
    relatedEntityType: 'user'
  });
};

/**
 * Generate a system notification
 * @param {Object} options - Options
 * @param {string} options.userId - Target user ID
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - System notification type
 * @returns {Object} Notification object
 */
const generateSystemNotification = ({ userId, title, message, type = NOTIFICATION_TYPES.ACCOUNT_ALERT }) => {
  return generateNotification(userId, type, title, message, {
    relatedEntityType: 'system'
  });
};

module.exports = {
  NOTIFICATION_TYPES,
  generateNotification,
  generateExpenseNotification,
  generateSettlementNotification,
  generateGroupNotification,
  generateFriendNotification,
  generateSystemNotification
}; 