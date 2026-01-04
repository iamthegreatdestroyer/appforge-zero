/**
 * Unit Tests for Event Bus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryEventBus, createEventBus } from '../event-bus';

describe('EventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = createEventBus() as InMemoryEventBus;
  });

  describe('publish and subscribe', () => {
    it('should publish events to subscribers', async () => {
      const handler = vi.fn();
      const payload = { message: 'Hello World' };

      eventBus.subscribe('test.topic', handler);
      await eventBus.publish('test.topic', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const payload = { data: 'test' };

      eventBus.subscribe('test.topic', handler1);
      eventBus.subscribe('test.topic', handler2);
      await eventBus.publish('test.topic', payload);

      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });

    it('should not call handlers for different topics', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('topic1', handler1);
      eventBus.subscribe('topic2', handler2);
      await eventBus.publish('topic1', { data: 'test' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle errors in handlers gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.subscribe('test.topic', errorHandler);
      eventBus.subscribe('test.topic', goodHandler);
      await eventBus.publish('test.topic', { data: 'test' });

      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('unsubscribe', () => {
    it('should remove handler from subscribers', async () => {
      const handler = vi.fn();

      eventBus.subscribe('test.topic', handler);
      eventBus.unsubscribe('test.topic', handler);
      await eventBus.publish('test.topic', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove the specified handler', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.topic', handler1);
      eventBus.subscribe('test.topic', handler2);
      eventBus.unsubscribe('test.topic', handler1);
      await eventBus.publish('test.topic', { data: 'test' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should clear all subscribers', async () => {
      const handler = vi.fn();

      eventBus.subscribe('test.topic', handler);
      await eventBus.close();
      await eventBus.publish('test.topic', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriberCount', () => {
    it('should return correct subscriber count', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      expect(eventBus.getSubscriberCount('test.topic')).toBe(0);

      eventBus.subscribe('test.topic', handler1);
      expect(eventBus.getSubscriberCount('test.topic')).toBe(1);

      eventBus.subscribe('test.topic', handler2);
      expect(eventBus.getSubscriberCount('test.topic')).toBe(2);

      eventBus.unsubscribe('test.topic', handler1);
      expect(eventBus.getSubscriberCount('test.topic')).toBe(1);
    });
  });
});
