/**
 * Event Bus Interface and In-Memory Implementation
 * 
 * Provides a simple pub/sub mechanism for real-time events.
 * The in-memory implementation is suitable for testing and single-instance deployments.
 * For production multi-instance deployments, consider a Redis-backed implementation.
 */

export interface EventPayload {
  [key: string]: any;
}

/**
 * Event bus interface
 */
export interface EventBus {
  /**
   * Publish an event to a topic
   */
  publish(topic: string, payload: EventPayload): Promise<void>;

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, handler: (payload: EventPayload) => void): void;

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, handler: (payload: EventPayload) => void): void;

  /**
   * Close the event bus
   */
  close(): Promise<void>;
}

/**
 * In-memory event bus implementation for testing and single-instance deployments
 */
export class InMemoryEventBus implements EventBus {
  private subscribers: Map<string, Set<(payload: EventPayload) => void>>;

  constructor() {
    this.subscribers = new Map();
  }

  async publish(topic: string, payload: EventPayload): Promise<void> {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      // Create a copy to avoid modification during iteration
      const handlersCopy = Array.from(handlers);
      for (const handler of handlersCopy) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for topic ${topic}:`, error);
        }
      }
    }
  }

  subscribe(topic: string, handler: (payload: EventPayload) => void): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);
  }

  unsubscribe(topic: string, handler: (payload: EventPayload) => void): void {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    }
  }

  async close(): Promise<void> {
    this.subscribers.clear();
  }

  /**
   * Get subscriber count for a topic (useful for testing)
   */
  getSubscriberCount(topic: string): number {
    return this.subscribers.get(topic)?.size || 0;
  }
}

/**
 * Create an in-memory event bus
 */
export function createEventBus(): EventBus {
  return new InMemoryEventBus();
}
