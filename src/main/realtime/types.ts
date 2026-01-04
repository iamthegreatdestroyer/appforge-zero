/**
 * Real-Time WebSocket Gateway Types
 *
 * Type definitions for:
 * - WebSocket connections
 * - Presence tracking
 * - Event publishing
 * - Authentication
 */

import { JWTPayload } from "../auth/types";

/**
 * WebSocket connection state
 */
export interface WSConnection {
  id: string; // Connection ID
  userId: string;
  socket: any; // WebSocket instance
  authenticatedAt: Date;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    deviceId?: string;
  };
}

/**
 * Presence data stored in Redis
 */
export interface PresenceData {
  userId: string;
  connectionId: string;
  status: "online" | "away" | "offline";
  connectedAt: Date;
  lastSeenAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Event bus topic
 */
export type EventTopic = "user.connected" | "user.disconnected" | "user.presence" | string;

/**
 * Event payload
 */
export interface EventPayload {
  topic: EventTopic;
  userId: string;
  connectionId: string;
  timestamp: Date;
  data?: Record<string, any>;
}

/**
 * EventBus interface for publishing events
 * (To be implemented with Kafka in a later story)
 */
export interface EventBus {
  /**
   * Publish an event to a topic
   */
  publish(topic: EventTopic, payload: EventPayload): Promise<void>;

  /**
   * Close the event bus connection
   */
  close(): Promise<void>;
}

/**
 * Redis client interface for presence tracking
 */
export interface RedisClient {
  /**
   * Add a presence entry to Redis Streams
   */
  xadd(
    key: string,
    id: string,
    ...args: string[]
  ): Promise<string>;

  /**
   * Remove a presence entry
   */
  del(key: string): Promise<number>;

  /**
   * Set a key-value pair with expiration
   */
  setex(key: string, seconds: number, value: string): Promise<string>;

  /**
   * Get a value by key
   */
  get(key: string): Promise<string | null>;

  /**
   * Close the Redis connection
   */
  quit(): Promise<void>;
}

/**
 * WebSocket Gateway configuration
 */
export interface GatewayConfig {
  port: number;
  jwtSecret: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  presence: {
    streamKey: string; // e.g., "presence:stream"
    ttl: number; // Presence TTL in seconds
  };
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * WebSocket message types
 */
export type WSMessageType = "auth" | "ping" | "pong" | "event";

/**
 * WebSocket message structure
 */
export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  timestamp?: Date;
}

/**
 * Gateway stats
 */
export interface GatewayStats {
  totalConnections: number;
  authenticatedConnections: number;
  totalEventsPublished: number;
  uptime: number; // in seconds
}
