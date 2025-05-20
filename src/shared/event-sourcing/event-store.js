const { EventStoreDBClient } = require('@eventstore/db-client');
const config = require('../config');
const logger = require('../utils/logger');

class EventStore {
  constructor() {
    this.client = EventStoreDBClient.connectionString(config.eventStore.connectionString);
  }

  /**
   * Append events to a stream
   * @param {string} streamName Name of the event stream
   * @param {Array} events Array of events to append
   * @param {number} expectedRevision Expected stream revision (for optimistic concurrency)
   */
  async appendToStream(streamName, events, expectedRevision = -1) {
    try {
      const eventData = events.map(event => ({
        type: event.type,
        data: event.data,
        metadata: {
          timestamp: new Date().toISOString(),
          userId: event.userId,
          ...event.metadata
        }
      }));

      await this.client.appendToStream(streamName, eventData, {
        expectedRevision
      });

      logger.info(`Appended ${events.length} events to stream: ${streamName}`);
    } catch (error) {
      logger.error(`Failed to append events to stream ${streamName}:`, error);
      throw error;
    }
  }

  /**
   * Read events from a stream
   * @param {string} streamName Name of the event stream
   * @param {number} fromRevision Starting revision number
   * @returns {AsyncGenerator} Event stream
   */
  async *readStream(streamName, fromRevision = 0) {
    try {
      const events = this.client.readStream(streamName, {
        fromRevision,
        maxCount: 1000
      });

      for await (const resolvedEvent of events) {
        yield {
          type: resolvedEvent.event.type,
          data: resolvedEvent.event.data,
          metadata: resolvedEvent.event.metadata,
          revision: resolvedEvent.event.revision
        };
      }
    } catch (error) {
      logger.error(`Failed to read stream ${streamName}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to stream events
   * @param {string} streamName Name of the event stream
   * @param {Function} eventHandler Event handler function
   * @param {string} groupName Consumer group name for competing consumers
   */
  async subscribeToStream(streamName, eventHandler, groupName) {
    try {
      const subscription = this.client.subscribeToStream(streamName, {
        groupName,
        fromRevision: 'start'
      });

      for await (const resolvedEvent of subscription) {
        try {
          await eventHandler({
            type: resolvedEvent.event.type,
            data: resolvedEvent.event.data,
            metadata: resolvedEvent.event.metadata
          });
        } catch (error) {
          logger.error('Event handler failed:', error);
        }
      }
    } catch (error) {
      logger.error(`Stream subscription failed for ${streamName}:`, error);
      throw error;
    }
  }

  /**
   * Create a snapshot of an aggregate
   * @param {string} streamName Name of the event stream
   * @param {Object} snapshot Snapshot data
   * @param {number} revision Stream revision for the snapshot
   */
  async createSnapshot(streamName, snapshot, revision) {
    const snapshotStreamName = `${streamName}-snapshot`;
    
    try {
      await this.appendToStream(snapshotStreamName, [{
        type: 'snapshot',
        data: snapshot,
        metadata: {
          streamRevision: revision,
          timestamp: new Date().toISOString()
        }
      }]);

      logger.info(`Created snapshot for stream ${streamName} at revision ${revision}`);
    } catch (error) {
      logger.error(`Failed to create snapshot for stream ${streamName}:`, error);
      throw error;
    }
  }
}

module.exports = new EventStore(); 