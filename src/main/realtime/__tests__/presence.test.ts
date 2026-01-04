/**
 * Unit Tests for Presence Tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPresenceTracker, PresenceData } from '../presence';

describe('PresenceTracker', () => {
  let tracker: InMemoryPresenceTracker;

  beforeEach(() => {
    tracker = new InMemoryPresenceTracker();
  });

  describe('markConnected', () => {
    it('should mark user as connected', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
        metadata: { username: 'testuser' },
      };

      await tracker.markConnected(presence);

      const presences = await tracker.getPresence('user1');
      expect(presences).toHaveLength(1);
      expect(presences[0].userId).toBe('user1');
      expect(presences[0].connectionId).toBe('conn1');
      expect(presences[0].metadata?.username).toBe('testuser');
    });

    it('should support multiple connections for same user', async () => {
      const presence1: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };
      const presence2: PresenceData = {
        userId: 'user1',
        connectionId: 'conn2',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence1);
      await tracker.markConnected(presence2);

      const presences = await tracker.getPresence('user1');
      expect(presences).toHaveLength(2);
    });

    it('should write to stream', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence);

      const stream = tracker.getStream();
      expect(stream).toHaveLength(1);
      expect(stream[0].type).toBe('connected');
      expect(stream[0].userId).toBe('user1');
      expect(stream[0].connectionId).toBe('conn1');
    });
  });

  describe('markDisconnected', () => {
    it('should mark user as disconnected', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence);
      await tracker.markDisconnected('user1', 'conn1');

      const presences = await tracker.getPresence('user1');
      expect(presences).toHaveLength(0);
    });

    it('should only remove specific connection', async () => {
      const presence1: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };
      const presence2: PresenceData = {
        userId: 'user1',
        connectionId: 'conn2',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence1);
      await tracker.markConnected(presence2);
      await tracker.markDisconnected('user1', 'conn1');

      const presences = await tracker.getPresence('user1');
      expect(presences).toHaveLength(1);
      expect(presences[0].connectionId).toBe('conn2');
    });

    it('should write to stream', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence);
      await tracker.markDisconnected('user1', 'conn1');

      const stream = tracker.getStream();
      expect(stream).toHaveLength(2);
      expect(stream[1].type).toBe('disconnected');
      expect(stream[1].userId).toBe('user1');
      expect(stream[1].connectionId).toBe('conn1');
    });
  });

  describe('isOnline', () => {
    it('should return true when user has connections', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence);

      const isOnline = await tracker.isOnline('user1');
      expect(isOnline).toBe(true);
    });

    it('should return false when user has no connections', async () => {
      const isOnline = await tracker.isOnline('user1');
      expect(isOnline).toBe(false);
    });

    it('should return false after disconnection', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence);
      await tracker.markDisconnected('user1', 'conn1');

      const isOnline = await tracker.isOnline('user1');
      expect(isOnline).toBe(false);
    });
  });

  describe('getPresence', () => {
    it('should return empty array for user with no connections', async () => {
      const presences = await tracker.getPresence('user1');
      expect(presences).toEqual([]);
    });

    it('should return all connections for user', async () => {
      const presence1: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };
      const presence2: PresenceData = {
        userId: 'user1',
        connectionId: 'conn2',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence1);
      await tracker.markConnected(presence2);

      const presences = await tracker.getPresence('user1');
      expect(presences).toHaveLength(2);
    });
  });

  describe('close', () => {
    it('should clear all data', async () => {
      const presence: PresenceData = {
        userId: 'user1',
        connectionId: 'conn1',
        connectedAt: new Date(),
      };

      await tracker.markConnected(presence);
      await tracker.close();

      const presences = await tracker.getPresence('user1');
      expect(presences).toHaveLength(0);

      const stream = tracker.getStream();
      expect(stream).toHaveLength(0);
    });
  });
});
