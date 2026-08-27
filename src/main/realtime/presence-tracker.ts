/**
 * Presence Tracker
 *
 * Tracks user presence via Redis Streams.
 * Writes presence:userId:connId on connect and cleans on disconnect.
 */

import { RedisClient, PresenceData } from "./types";

/**
 * Presence tracker for managing user online status
 */
export class PresenceTracker {
  private redis: RedisClient;
  private streamKey: string;
  private ttl: number;

  constructor(redis: RedisClient, streamKey: string = "presence:stream", ttl: number = 300) {
    this.redis = redis;
    this.streamKey = streamKey;
    this.ttl = ttl;
  }

  /**
   * Track user connection (add to Redis Stream)
   */
  async trackConnection(userId: string, connectionId: string, metadata?: Record<string, any>): Promise<void> {
    const presenceData: PresenceData = {
      userId,
      connectionId,
      status: "online",
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      metadata,
    };

    // Write to Redis Stream
    const streamId = await this.redis.xadd(
      this.streamKey,
      "*", // Auto-generate ID
      "userId", userId,
      "connectionId", connectionId,
      "status", "online",
      "timestamp", presenceData.connectedAt.toISOString(),
      "metadata", JSON.stringify(metadata || {})
    );

    console.log(`[PresenceTracker] Tracked connection: userId=${userId}, connId=${connectionId}, streamId=${streamId}`);

    // Also set a key for quick lookup with TTL
    const presenceKey = `presence:${userId}:${connectionId}`;
    await this.redis.setex(presenceKey, this.ttl, JSON.stringify(presenceData));
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string, connectionId: string): Promise<void> {
    const presenceKey = `presence:${userId}:${connectionId}`;
    const existingData = await this.redis.get(presenceKey);

    if (existingData) {
      const presenceData: PresenceData = JSON.parse(existingData);
      presenceData.lastSeenAt = new Date();
      await this.redis.setex(presenceKey, this.ttl, JSON.stringify(presenceData));
      
      console.log(`[PresenceTracker] Updated last seen: userId=${userId}, connId=${connectionId}`);
    }
  }

  /**
   * Clean up presence on disconnect
   */
  async cleanupConnection(userId: string, connectionId: string): Promise<void> {
    // Write disconnect event to stream
    await this.redis.xadd(
      this.streamKey,
      "*",
      "userId", userId,
      "connectionId", connectionId,
      "status", "offline",
      "timestamp", new Date().toISOString()
    );

    // Remove the presence key
    const presenceKey = `presence:${userId}:${connectionId}`;
    await this.redis.del(presenceKey);

    console.log(`[PresenceTracker] Cleaned up connection: userId=${userId}, connId=${connectionId}`);
  }

  /**
   * Get presence data for a user connection
   */
  async getPresence(userId: string, connectionId: string): Promise<PresenceData | null> {
    const presenceKey = `presence:${userId}:${connectionId}`;
    const data = await this.redis.get(presenceKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as PresenceData;
  }
}

/**
 * Create a presence tracker instance
 */
export function createPresenceTracker(
  redis: RedisClient,
  streamKey?: string,
  ttl?: number
): PresenceTracker {
  return new PresenceTracker(redis, streamKey, ttl);
}
