/**
 * Presence Tracking Abstraction
 * 
 * Provides an interface for tracking user presence using Redis Streams.
 * Includes a mockable interface for testing.
 */

import { Redis } from 'ioredis';

export interface PresenceData {
  userId: string;
  connectionId: string;
  connectedAt: Date;
  metadata?: Record<string, any>;
}

export interface PresenceUpdate {
  type: 'connected' | 'disconnected';
  userId: string;
  connectionId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Presence tracker interface (mockable for tests)
 */
export interface PresenceTracker {
  /**
   * Mark user as connected
   */
  markConnected(presence: PresenceData): Promise<void>;

  /**
   * Mark user as disconnected
   */
  markDisconnected(userId: string, connectionId: string): Promise<void>;

  /**
   * Get current presence for a user
   */
  getPresence(userId: string): Promise<PresenceData[]>;

  /**
   * Check if user is online
   */
  isOnline(userId: string): Promise<boolean>;

  /**
   * Close the tracker
   */
  close(): Promise<void>;
}

/**
 * Redis-backed presence tracker using Redis Streams
 */
export class RedisPresenceTracker implements PresenceTracker {
  private redis: Redis;
  private streamKey: string;

  constructor(redis: Redis, streamKey: string = 'presence:stream') {
    this.redis = redis;
    this.streamKey = streamKey;
  }

  async markConnected(presence: PresenceData): Promise<void> {
    const update: PresenceUpdate = {
      type: 'connected',
      userId: presence.userId,
      connectionId: presence.connectionId,
      timestamp: presence.connectedAt,
      metadata: presence.metadata,
    };

    // Write to Redis Stream
    await this.redis.xadd(
      this.streamKey,
      '*',
      'type', update.type,
      'userId', update.userId,
      'connectionId', update.connectionId,
      'timestamp', update.timestamp.toISOString(),
      'metadata', JSON.stringify(update.metadata || {})
    );

    // Also update presence hash for quick lookups
    const presenceKey = `presence:user:${presence.userId}:${presence.connectionId}`;
    await this.redis.hset(
      presenceKey,
      'userId', presence.userId,
      'connectionId', presence.connectionId,
      'connectedAt', presence.connectedAt.toISOString(),
      'metadata', JSON.stringify(presence.metadata || {})
    );
    
    // Set TTL (e.g., 1 hour)
    await this.redis.expire(presenceKey, 3600);
  }

  async markDisconnected(userId: string, connectionId: string): Promise<void> {
    const update: PresenceUpdate = {
      type: 'disconnected',
      userId,
      connectionId,
      timestamp: new Date(),
    };

    // Write to Redis Stream
    await this.redis.xadd(
      this.streamKey,
      '*',
      'type', update.type,
      'userId', update.userId,
      'connectionId', update.connectionId,
      'timestamp', update.timestamp.toISOString()
    );

    // Remove from presence hash
    const presenceKey = `presence:user:${userId}:${connectionId}`;
    await this.redis.del(presenceKey);
  }

  async getPresence(userId: string): Promise<PresenceData[]> {
    // Scan for all connections for this user
    const pattern = `presence:user:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    const presences: PresenceData[] = [];
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      if (data && data.userId) {
        presences.push({
          userId: data.userId,
          connectionId: data.connectionId,
          connectedAt: new Date(data.connectedAt),
          metadata: JSON.parse(data.metadata || '{}'),
        });
      }
    }

    return presences;
  }

  async isOnline(userId: string): Promise<boolean> {
    const pattern = `presence:user:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    return keys.length > 0;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * In-memory presence tracker for testing
 */
export class InMemoryPresenceTracker implements PresenceTracker {
  private presences: Map<string, PresenceData[]>;
  private stream: PresenceUpdate[];

  constructor() {
    this.presences = new Map();
    this.stream = [];
  }

  async markConnected(presence: PresenceData): Promise<void> {
    const userPresences = this.presences.get(presence.userId) || [];
    userPresences.push(presence);
    this.presences.set(presence.userId, userPresences);

    this.stream.push({
      type: 'connected',
      userId: presence.userId,
      connectionId: presence.connectionId,
      timestamp: presence.connectedAt,
      metadata: presence.metadata,
    });
  }

  async markDisconnected(userId: string, connectionId: string): Promise<void> {
    const userPresences = this.presences.get(userId) || [];
    const filtered = userPresences.filter(p => p.connectionId !== connectionId);
    
    if (filtered.length === 0) {
      this.presences.delete(userId);
    } else {
      this.presences.set(userId, filtered);
    }

    this.stream.push({
      type: 'disconnected',
      userId,
      connectionId,
      timestamp: new Date(),
    });
  }

  async getPresence(userId: string): Promise<PresenceData[]> {
    return this.presences.get(userId) || [];
  }

  async isOnline(userId: string): Promise<boolean> {
    const presences = this.presences.get(userId) || [];
    return presences.length > 0;
  }

  async close(): Promise<void> {
    this.presences.clear();
    this.stream = [];
  }

  /**
   * Get stream for testing
   */
  getStream(): PresenceUpdate[] {
    return [...this.stream];
  }
}

/**
 * Create presence tracker
 */
export function createPresenceTracker(redis?: Redis): PresenceTracker {
  if (redis) {
    return new RedisPresenceTracker(redis);
  }
  return new InMemoryPresenceTracker();
}
