/**
 * EventBus Implementation (Stubbed)
 *
 * This is a stub implementation that will be replaced with Kafka in a later story.
 * For now, it logs events to console and stores them in memory for testing.
 */

import { EventBus, EventTopic, EventPayload } from "./types";

/**
 * In-memory EventBus implementation (for testing and development)
 */
export class InMemoryEventBus implements EventBus {
  private events: EventPayload[] = [];
  private listeners: Map<EventTopic, ((payload: EventPayload) => void)[]> = new Map();

  /**
   * Publish an event to a topic
   */
  async publish(topic: EventTopic, payload: EventPayload): Promise<void> {
    console.log(`[EventBus] Publishing to topic '${topic}':`, payload);
    
    // Store event for testing
    this.events.push(payload);

    // Notify listeners (useful for testing)
    const topicListeners = this.listeners.get(topic) || [];
    topicListeners.forEach(listener => listener(payload));
  }

  /**
   * Subscribe to a topic (for testing)
   */
  subscribe(topic: EventTopic, listener: (payload: EventPayload) => void): void {
    const topicListeners = this.listeners.get(topic) || [];
    topicListeners.push(listener);
    this.listeners.set(topic, topicListeners);
  }

  /**
   * Get all published events (for testing)
   */
  getEvents(): EventPayload[] {
    return [...this.events];
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Close the event bus
   */
  async close(): Promise<void> {
    console.log("[EventBus] Closing connection");
    this.events = [];
    this.listeners.clear();
  }
}

/**
 * Create an EventBus instance
 * This will be replaced with Kafka implementation in a later story
 */
export function createEventBus(): EventBus {
  return new InMemoryEventBus();
}

/**
 * Export types
 */
export type { EventBus, EventTopic, EventPayload };
