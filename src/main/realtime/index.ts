/**
 * Real-Time WebSocket Gateway Module
 *
 * Provides:
 * - WebSocket server with JWT authentication
 * - Presence tracking via Redis Streams
 * - Event publishing (stubbed for Kafka)
 */

// Types
export * from "./types";

// Event Bus
export { createEventBus, InMemoryEventBus } from "./event-bus";
export type { EventBus, EventTopic, EventPayload } from "./event-bus";

// Presence Tracker
export { createPresenceTracker, PresenceTracker } from "./presence-tracker";

// WebSocket Gateway
export { createWebSocketGateway, WebSocketGateway } from "./gateway";

// Re-export commonly used types
export type {
  WSConnection,
  PresenceData,
  GatewayConfig,
  GatewayStats,
  WSMessage,
  AuthResult,
  RedisClient,
} from "./types";
