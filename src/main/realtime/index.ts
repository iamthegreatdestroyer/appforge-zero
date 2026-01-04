/**
 * Real-time WebSocket Gateway Module
 * 
 * Exports:
 * - WebSocket gateway with JWT authentication
 * - Presence tracking (Redis Streams)
 * - Event bus for pub/sub
 * - Connection handler
 */

// Gateway
export {
  WebSocketGateway,
  WebSocketGatewayConfig,
  createWebSocketGateway,
} from './gateway';

// Presence Tracking
export {
  PresenceTracker,
  PresenceData,
  PresenceUpdate,
  RedisPresenceTracker,
  InMemoryPresenceTracker,
  createPresenceTracker,
} from './presence';

// Event Bus
export {
  EventBus,
  EventPayload,
  InMemoryEventBus,
  createEventBus,
} from './event-bus';

// Connection Handler
export {
  ConnectionHandler,
  ConnectionContext,
  ConnectionHandlerConfig,
  createConnectionHandler,
} from './handlers/connectionHandler';

/**
 * Factory function to create a complete WebSocket Gateway setup
 */
import { WebSocketGateway, WebSocketGatewayConfig } from './gateway';
import { createPresenceTracker, PresenceTracker } from './presence';
import { createEventBus, EventBus } from './event-bus';
import { JWTManager } from '../auth';
import { Redis } from 'ioredis';

export interface WebSocketGatewaySetupConfig {
  port?: number;
  jwtManager: JWTManager;
  redis?: Redis;
  eventBus?: EventBus;
  presenceTracker?: PresenceTracker;
}

export interface WebSocketGatewaySetup {
  gateway: WebSocketGateway;
  eventBus: EventBus;
  presenceTracker: PresenceTracker;
  close: () => Promise<void>;
}

/**
 * Create a complete WebSocket Gateway setup with all dependencies
 */
export function setupWebSocketGateway(
  config: WebSocketGatewaySetupConfig
): WebSocketGatewaySetup {
  // Create or use provided event bus
  const eventBus = config.eventBus || createEventBus();

  // Create or use provided presence tracker
  const presenceTracker = config.presenceTracker || createPresenceTracker(config.redis);

  // Create gateway
  const gateway = new WebSocketGateway({
    port: config.port,
    jwtManager: config.jwtManager,
    presenceTracker,
    eventBus,
  });

  // Return setup with close function
  return {
    gateway,
    eventBus,
    presenceTracker,
    close: async () => {
      await gateway.close();
      await presenceTracker.close();
      await eventBus.close();
    },
  };
}
