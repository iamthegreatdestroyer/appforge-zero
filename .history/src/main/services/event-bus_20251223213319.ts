/**
 * Event System - Pub/Sub Event Bus with Replay and History
 *
 * Provides:
 * - Event publishing and subscribing
 * - Event history and replay
 * - Type-safe event handling
 * - Event filtering and ordering
 */

import { DatabaseManager } from '../database';

/**
 * Event type
 */
export type EventType =
  | 'template.created'
  | 'template.updated'
  | 'template.deleted'
  | 'template.archived'
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'trend.discovered'
  | 'trend.archived'
  | 'trend.correlated'
  | 'build.started'
  | 'build.completed'
  | 'build.failed'
  | 'build.deployed'
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'service.health';

/**
 * Event payload
 */
export interface Event<T = any> {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  version: number;
  payload: T;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
  };
}

/**
 * Event handler
 */
export type EventHandler<T = any> = (event: Event<T>) => Promise<void>;

/**
 * Event handler registration
 */
interface HandlerRegistration {
  eventType: EventType;
  handler: EventHandler;
}

/**
 * Event bus implementation
 */
export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private eventHistory: Event[] = [];
  private maxHistorySize: number = 10000;
  private db?: DatabaseManager;

  constructor(db?: DatabaseManager) {
    this.db = db;
  }

  /**
   * Subscribe to event type
   */
  subscribe<T = any>(eventType: EventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as EventHandler);
  }

  /**
   * Unsubscribe from event type
   */
  unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Publish event
   */
  async publish<T = any>(event: Event<T>): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Persist to database if available
    if (this.db) {
      try {
        await this.persistEvent(event);
      } catch (error) {
        console.error('Failed to persist event:', error);
      }
    }

    // Call all handlers for this event type
    const handlers = this.handlers.get(event.type) || new Set();

    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) => handler(event))
    );

    // Log any failed handlers
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Event handler failed for ${event.type}:`, result.reason);
      }
    });
  }

  /**
   * Get event history
   */
  getHistory(
    eventType?: EventType,
    limit: number = 100
  ): Event[] {
    let filtered = [...this.eventHistory];

    if (eventType) {
      filtered = filtered.filter((e) => e.type === eventType);
    }

    // Return most recent events
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get events by source
   */
  getEventsBySource(source: string, limit: number = 100): Event[] {
    return this.eventHistory
      .filter((e) => e.source === source)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events by correlation ID
   */
  getEventsByCorrelation(correlationId: string): Event[] {
    return this.eventHistory
      .filter((e) => e.metadata?.correlationId === correlationId)
      .reverse();
  }

  /**
   * Replay events from timestamp
   */
  async replay(fromDate: Date): Promise<void> {
    const events = this.eventHistory.filter((e) => e.timestamp >= fromDate);

    console.log(`Replaying ${events.length} events from ${fromDate}`);

    for (const event of events) {
      const handlers = this.handlers.get(event.type) || new Set();

      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Replay failed for event ${event.id}:`, error);
        }
      }
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get event count by type
   */
  getEventCounts(): Record<EventType, number> {
    const counts: Record<EventType, number> = {} as any;

    this.eventHistory.forEach((event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return counts;
  }

  /**
   * Get handler count for event type
   */
  getHandlerCount(eventType: EventType): number {
    return this.handlers.get(eventType)?.size || 0;
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: Event): Promise<void> {
    if (!this.db) return;

    try {
      // Create events table if needed
      const tableName = 'events';

      // Insert event into database
      const sql = `
        INSERT INTO ${tableName} (
          id, type, timestamp, source, version, payload, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Note: This would need actual database implementation
      // For now, we'll just track in memory
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }
}

/**
 * Event publisher helper
 */
export class EventPublisher {
  constructor(private eventBus: EventBus) {}

  /**
   * Publish event with auto-ID and timestamp
   */
  async publish<T = any>(
    type: EventType,
    source: string,
    payload: T,
    metadata?: any
  ): Promise<Event<T>> {
    const event: Event<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      source,
      version: 1,
      payload,
      metadata,
    };

    await this.eventBus.publish(event);
    return event;
  }

  /**
   * Publish multiple events (batch)
   */
  async publishBatch<T = any>(
    events: Array<{
      type: EventType;
      source: string;
      payload: T;
      metadata?: any;
    }>
  ): Promise<Event<T>[]> {
    const publishedEvents: Event<T>[] = [];

    for (const event of events) {
      const published = await this.publish(
        event.type,
        event.source,
        event.payload,
        event.metadata
      );
      publishedEvents.push(published);
    }

    return publishedEvents;
  }

  /**
   * Create event with causation chain
   */
  async publishWithCausation<T = any>(
    causationId: string,
    type: EventType,
    source: string,
    payload: T,
    metadata?: any
  ): Promise<Event<T>> {
    return this.publish(type, source, payload, {
      ...metadata,
      causationId,
    });
  }
}

/**
 * Create event bus
 */
export function createEventBus(db?: DatabaseManager): EventBus {
  return new EventBus(db);
}

/**
 * Create event publisher
 */
export function createEventPublisher(eventBus: EventBus): EventPublisher {
  return new EventPublisher(eventBus);
}
