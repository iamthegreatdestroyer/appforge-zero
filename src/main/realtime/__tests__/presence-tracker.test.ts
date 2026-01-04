/**
 * PresenceTracker Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PresenceTracker } from "../presence-tracker";
import { MockRedisClient } from "./test-utils";

describe("PresenceTracker", () => {
  let redis: MockRedisClient;
  let presenceTracker: PresenceTracker;

  beforeEach(() => {
    redis = new MockRedisClient();
    presenceTracker = new PresenceTracker(redis, "presence:stream", 300);
  });

  describe("trackConnection", () => {
    it("should track a new connection", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";
      const metadata = { userAgent: "Mozilla/5.0" };

      await presenceTracker.trackConnection(userId, connectionId, metadata);

      // Verify stream entry
      const stream = redis.getStream("presence:stream");
      expect(stream).toHaveLength(1);
      expect(stream[0].userId).toBe(userId);
      expect(stream[0].connectionId).toBe(connectionId);
      expect(stream[0].status).toBe("online");

      // Verify presence key
      const presenceKey = `presence:${userId}:${connectionId}`;
      const presenceData = await redis.get(presenceKey);
      expect(presenceData).not.toBeNull();
      
      const parsed = JSON.parse(presenceData!);
      expect(parsed.userId).toBe(userId);
      expect(parsed.connectionId).toBe(connectionId);
      expect(parsed.status).toBe("online");
    });

    it("should store metadata with connection", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";
      const metadata = {
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.1.1",
        deviceId: "device-789",
      };

      await presenceTracker.trackConnection(userId, connectionId, metadata);

      const presenceKey = `presence:${userId}:${connectionId}`;
      const presenceData = await redis.get(presenceKey);
      const parsed = JSON.parse(presenceData!);
      
      expect(parsed.metadata).toEqual(metadata);
    });

    it("should handle connection without metadata", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";

      await presenceTracker.trackConnection(userId, connectionId);

      const presenceKey = `presence:${userId}:${connectionId}`;
      const presenceData = await redis.get(presenceKey);
      const parsed = JSON.parse(presenceData!);
      
      // Metadata might be undefined or an empty object
      expect(parsed.metadata === undefined || Object.keys(parsed.metadata).length === 0).toBe(true);
    });

    it("should track multiple connections for same user", async () => {
      const userId = "user-123";
      const connectionId1 = "conn-1";
      const connectionId2 = "conn-2";

      await presenceTracker.trackConnection(userId, connectionId1);
      await presenceTracker.trackConnection(userId, connectionId2);

      const presence1 = await presenceTracker.getPresence(userId, connectionId1);
      const presence2 = await presenceTracker.getPresence(userId, connectionId2);

      expect(presence1).not.toBeNull();
      expect(presence2).not.toBeNull();
      expect(presence1!.connectionId).toBe(connectionId1);
      expect(presence2!.connectionId).toBe(connectionId2);
    });
  });

  describe("updateLastSeen", () => {
    it("should update last seen timestamp", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";

      await presenceTracker.trackConnection(userId, connectionId);

      // Get initial presence
      const initialPresence = await presenceTracker.getPresence(userId, connectionId);
      const initialLastSeen = new Date(initialPresence!.lastSeenAt);

      // Wait a bit to ensure timestamp differs
      await new Promise(resolve => setTimeout(resolve, 10));

      await presenceTracker.updateLastSeen(userId, connectionId);

      // Get updated presence
      const updatedPresence = await presenceTracker.getPresence(userId, connectionId);
      const updatedLastSeen = new Date(updatedPresence!.lastSeenAt);

      expect(updatedLastSeen.getTime()).toBeGreaterThan(initialLastSeen.getTime());
    });

    it("should handle update for non-existent connection", async () => {
      const userId = "user-123";
      const connectionId = "conn-nonexistent";

      // Should not throw
      await expect(
        presenceTracker.updateLastSeen(userId, connectionId)
      ).resolves.not.toThrow();
    });
  });

  describe("cleanupConnection", () => {
    it("should clean up a connection", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";

      await presenceTracker.trackConnection(userId, connectionId);

      // Verify connection exists
      let presence = await presenceTracker.getPresence(userId, connectionId);
      expect(presence).not.toBeNull();

      await presenceTracker.cleanupConnection(userId, connectionId);

      // Verify connection is cleaned up
      presence = await presenceTracker.getPresence(userId, connectionId);
      expect(presence).toBeNull();
    });

    it("should write disconnect event to stream", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";

      await presenceTracker.trackConnection(userId, connectionId);
      await presenceTracker.cleanupConnection(userId, connectionId);

      const stream = redis.getStream("presence:stream");
      
      // Should have 2 entries: connect and disconnect
      expect(stream).toHaveLength(2);
      expect(stream[0].status).toBe("online");
      expect(stream[1].status).toBe("offline");
      expect(stream[1].userId).toBe(userId);
      expect(stream[1].connectionId).toBe(connectionId);
    });

    it("should handle cleanup of non-existent connection", async () => {
      const userId = "user-123";
      const connectionId = "conn-nonexistent";

      // Should not throw
      await expect(
        presenceTracker.cleanupConnection(userId, connectionId)
      ).resolves.not.toThrow();
    });
  });

  describe("getPresence", () => {
    it("should return null for non-existent connection", async () => {
      const presence = await presenceTracker.getPresence("user-123", "conn-nonexistent");
      expect(presence).toBeNull();
    });

    it("should return presence data for existing connection", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";
      const metadata = { userAgent: "Mozilla/5.0" };

      await presenceTracker.trackConnection(userId, connectionId, metadata);

      const presence = await presenceTracker.getPresence(userId, connectionId);
      
      expect(presence).not.toBeNull();
      expect(presence!.userId).toBe(userId);
      expect(presence!.connectionId).toBe(connectionId);
      expect(presence!.status).toBe("online");
      expect(presence!.metadata).toEqual(metadata);
    });

    it("should include timestamps in presence data", async () => {
      const userId = "user-123";
      const connectionId = "conn-456";

      await presenceTracker.trackConnection(userId, connectionId);

      const presence = await presenceTracker.getPresence(userId, connectionId);
      
      expect(presence).not.toBeNull();
      // After JSON serialization/deserialization, dates are strings
      expect(presence!.connectedAt).toBeDefined();
      expect(presence!.lastSeenAt).toBeDefined();
      expect(typeof presence!.connectedAt).toBe('string');
      expect(typeof presence!.lastSeenAt).toBe('string');
    });
  });
});
