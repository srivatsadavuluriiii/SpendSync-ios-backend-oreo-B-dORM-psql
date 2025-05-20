const eventStore = require('../../../../shared/event-sourcing/event-store');
const { v4: uuidv4 } = require('uuid');
const ExpenseAggregate = require('../aggregates/expense.aggregate');
const { BadRequestError } = require('../../../../shared/errors');

class CreateExpenseCommand {
  constructor(data) {
    this.data = data;
  }

  async execute() {
    const expenseId = uuidv4();
    const streamName = `expense-${expenseId}`;

    try {
      // Create new expense aggregate
      const expense = new ExpenseAggregate(expenseId);

      // Apply the create event
      const createEvent = {
        type: 'ExpenseCreated',
        data: {
          expenseId,
          description: this.data.description,
          amount: this.data.amount,
          currency: this.data.currency,
          date: this.data.date,
          category: this.data.category,
          paidBy: this.data.paidBy,
          groupId: this.data.groupId
        },
        metadata: {
          userId: this.data.userId,
          timestamp: new Date().toISOString()
        }
      };

      // Apply splits event
      const splitsEvent = {
        type: 'ExpenseSplitsAssigned',
        data: {
          expenseId,
          splits: this.data.splits
        },
        metadata: {
          userId: this.data.userId,
          timestamp: new Date().toISOString()
        }
      };

      // Append events to stream
      await eventStore.appendToStream(streamName, [createEvent, splitsEvent]);

      // Apply events to aggregate
      expense.applyEvent(createEvent);
      expense.applyEvent(splitsEvent);

      return expense.getState();
    } catch (error) {
      throw new BadRequestError('Failed to create expense', error);
    }
  }
}

module.exports = CreateExpenseCommand; 