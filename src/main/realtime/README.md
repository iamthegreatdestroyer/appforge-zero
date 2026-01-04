# Real-Time WebSocket Gateway Module

This module provides a WebSocket Gateway with JWT authentication, presence tracking via Redis Streams, and event publishing capabilities.

## Features

- **JWT Authentication**: Secure WebSocket connections using existing JWT tokens
- **Presence Tracking**: Track user online/offline status via Redis Streams
- **Event Publishing**: Publish connection events to an EventBus interface (stubbed for Kafka integration)
- **Dependency Injection**: All components use DI for easy testing and mocking
- **Comprehensive Testing**: Unit and integration tests with high coverage

## Architecture

```
src/main/realtime/
├── types.ts              # Type definitions
├── event-bus.ts          # EventBus interface and in-memory stub
├── presence-tracker.ts   # Presence tracking with Redis Streams
├── gateway.ts            # Main WebSocket Gateway
├── index.ts              # Public API exports
└── __tests__/
    ├── test-utils.ts     # Test utilities and mocks
    ├── event-bus.test.ts
    ├── presence-tracker.test.ts
    ├── gateway.test.ts
    └── gateway.integration.test.ts
```

## Usage

### Basic Setup

```typescript
import { createJWTManager } from '../auth';
import {
  createEventBus,
  createPresenceTracker,
  createWebSocketGateway,
  GatewayConfig
} from './realtime';
import Redis from 'ioredis';

// Setup dependencies
const jwtManager = createJWTManager({
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: 900, // 15 minutes
  // ... other auth config
});

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const eventBus = createEventBus();
const presenceTracker = createPresenceTracker(redis, 'presence:stream', 300);

// Configure and start gateway
const config: GatewayConfig = {
  port: 8080,
  jwtSecret: process.env.JWT_SECRET!,
  redis: {
    host: 'localhost',
    port: 6379,
  },
  presence: {
    streamKey: 'presence:stream',
    ttl: 300, // 5 minutes
  },
};

const gateway = createWebSocketGateway(
  jwtManager,
  eventBus,
  presenceTracker,
  config
);

await gateway.start();

console.log('WebSocket Gateway started on port 8080');
```

### Client Connection

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Authenticate with JWT
  ws.send(JSON.stringify({
    type: 'auth',
    payload: { token: 'your-jwt-token' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'auth') {
    console.log('Authenticated:', message.payload);
    // Connection ID and success status
  }
  
  if (message.type === 'pong') {
    console.log('Received pong');
  }
  
  if (message.type === 'error') {
    console.error('Error:', message.payload.message);
  }
};

// Send ping to keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000); // Every 30 seconds
```

## Components

### EventBus

The EventBus is an interface for publishing events. The current implementation is in-memory (for testing), but will be replaced with Kafka in a future story.

```typescript
interface EventBus {
  publish(topic: EventTopic, payload: EventPayload): Promise<void>;
  close(): Promise<void>;
}

// Topics
type EventTopic = 
  | "user.connected" 
  | "user.disconnected" 
  | "user.presence" 
  | string;

// Payload
interface EventPayload {
  topic: EventTopic;
  userId: string;
  connectionId: string;
  timestamp: Date;
  data?: Record<string, any>;
}
```

### PresenceTracker

Tracks user presence using Redis Streams:

```typescript
// Track a connection
await presenceTracker.trackConnection(
  userId,
  connectionId,
  { userAgent: '...', ipAddress: '...' }
);

// Update last seen
await presenceTracker.updateLastSeen(userId, connectionId);

// Clean up on disconnect
await presenceTracker.cleanupConnection(userId, connectionId);

// Get presence data
const presence = await presenceTracker.getPresence(userId, connectionId);
```

Redis Stream Format:
- **Key**: `presence:stream`
- **Entries**: 
  - `userId`, `connectionId`, `status` (online/offline), `timestamp`, `metadata`

### WebSocketGateway

The main gateway handles:
- Connection management
- Authentication via JWT
- Message routing
- Event publishing

```typescript
// Start the gateway
await gateway.start();

// Get statistics
const stats = gateway.getStats();
// {
//   totalConnections: number,
//   authenticatedConnections: number,
//   totalEventsPublished: number,
//   uptime: number
// }

// Get all connections
const connections = gateway.getConnections();

// Stop the gateway
await gateway.stop();
```

## Message Protocol

### Authentication Message (Client → Server)

```json
{
  "type": "auth",
  "payload": {
    "token": "jwt-access-token"
  }
}
```

### Authentication Response (Server → Client)

Success:
```json
{
  "type": "auth",
  "payload": {
    "success": true,
    "connectionId": "conn_12345_abcdef"
  }
}
```

Error:
```json
{
  "type": "error",
  "payload": {
    "message": "Invalid or expired token"
  }
}
```

### Ping/Pong (Keep-Alive)

Client → Server:
```json
{
  "type": "ping"
}
```

Server → Client:
```json
{
  "type": "pong",
  "timestamp": "2026-01-04T21:00:00.000Z"
}
```

## Events Published

The gateway publishes the following events to the EventBus:

### user.connected

Published when a user successfully authenticates:

```typescript
{
  topic: "user.connected",
  userId: "user-123",
  connectionId: "conn_12345_abcdef",
  timestamp: Date,
  data: {
    userAgent: "Mozilla/5.0 ...",
    ipAddress: "192.168.1.1"
  }
}
```

### user.disconnected

Published when a user disconnects:

```typescript
{
  topic: "user.disconnected",
  userId: "user-123",
  connectionId: "conn_12345_abcdef",
  timestamp: Date,
  data: {
    userAgent: "Mozilla/5.0 ...",
    ipAddress: "192.168.1.1"
  }
}
```

## Testing

### Running Tests

```bash
# Run all realtime tests
npm test -- src/main/realtime/__tests__/

# Run specific test file
npm test -- src/main/realtime/__tests__/gateway.test.ts

# Run with coverage
npm test -- --coverage src/main/realtime/
```

### Test Coverage

- **EventBus**: 10 unit tests
- **PresenceTracker**: 12 unit tests
- **Gateway**: 12 unit tests
- **Integration**: 3 integration tests

**Total**: 37 tests, all passing

### Mocking for Tests

Use the provided test utilities:

```typescript
import {
  MockRedisClient,
  MockEventBus,
  createTestJWTManager,
  createTestUser,
  waitFor
} from './test-utils';

// Create mocks
const redis = new MockRedisClient();
const eventBus = new MockEventBus();
const jwtManager = createTestJWTManager();

// Create test user and token
const user = createTestUser({ id: 'test-user' });
const token = jwtManager.generateAccessToken(user);

// Wait for async conditions
await waitFor(() => connections.length === 0, 5000);
```

## Configuration

### GatewayConfig

```typescript
interface GatewayConfig {
  port: number;                    // WebSocket server port
  jwtSecret: string;               // JWT verification secret
  redis: {
    host: string;                  // Redis host
    port: number;                  // Redis port
    password?: string;             // Redis password (optional)
    db?: number;                   // Redis database (optional)
  };
  presence: {
    streamKey: string;             // Redis stream key for presence
    ttl: number;                   // Presence TTL in seconds
  };
}
```

### Example Configuration

```typescript
const config: GatewayConfig = {
  port: 8080,
  jwtSecret: process.env.JWT_SECRET!,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
  },
  presence: {
    streamKey: 'presence:stream',
    ttl: 300, // 5 minutes
  },
};
```

## Security Considerations

1. **Authentication Timeout**: Clients must authenticate within 10 seconds or the connection will be closed
2. **JWT Validation**: Tokens are verified using the configured JWT secret
3. **Connection Tracking**: All connections are tracked with user ID and connection ID
4. **Presence Cleanup**: Presence data is automatically cleaned up on disconnect

## Future Enhancements

- [ ] Replace in-memory EventBus with Kafka integration
- [ ] Add Redis connection pooling
- [ ] Implement reconnection handling
- [ ] Add rate limiting per user
- [ ] Support custom message handlers
- [ ] Add metrics and monitoring
- [ ] Implement horizontal scaling support
- [ ] Add WebSocket compression
- [ ] Support for clustered Redis

## Dependencies

- **ws**: WebSocket server implementation
- **ioredis**: Redis client for presence tracking
- **crypto**: For generating unique IDs
- Existing **auth module** for JWT verification

## License

MIT
