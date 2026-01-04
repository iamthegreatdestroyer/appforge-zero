# WebSocket Gateway

Real-time WebSocket gateway with JWT authentication, presence tracking, and event bus.

## Features

- **JWT Authentication**: Secure WebSocket connections using JWT tokens from the auth module
- **Presence Tracking**: Track user online/offline status using Redis Streams (or in-memory for testing)
- **Event Bus**: Publish/subscribe mechanism for real-time events
- **Connection Management**: Handle connection lifecycle with graceful disconnection

## Architecture

```
┌─────────────────┐
│  WebSocket      │
│  Gateway        │
├─────────────────┤
│ - Auth via JWT  │
│ - Token extract │
│ - WS server     │
└────────┬────────┘
         │
         ├──────────┐
         │          │
┌────────▼────────┐ │
│  Connection     │ │
│  Handler        │ │
├─────────────────┤ │
│ - Lifecycle     │ │
│ - Events        │ │
│ - Presence      │ │
└────────┬────────┘ │
         │          │
    ┌────▼──────┐   │
    │ Presence  │   │
    │ Tracker   │   │
    └───────────┘   │
                    │
               ┌────▼──────┐
               │ Event Bus │
               └───────────┘
```

## Quick Start

### Development Mode

```typescript
import { setupWebSocketGateway } from '@main/realtime';
import { createAuthModule } from '@main/auth';

// Create auth module
const authModule = createAuthModule({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
});

// Setup WebSocket gateway
const gateway = setupWebSocketGateway({
  port: 8080,
  jwtManager: authModule.jwtManager,
  // redis: optionalRedisClient, // For production
});

console.log('WebSocket Gateway listening on port 8080');

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await gateway.close();
});
```

### Test Mode

```typescript
import { setupWebSocketGateway } from '@main/realtime';
import { JWTManager } from '@main/auth';

// Create test JWT manager
const jwtManager = new JWTManager({
  jwtSecret: 'test-secret-key',
  jwtExpiresIn: 900,
  // ... other config
});

// Setup with in-memory components
const gateway = setupWebSocketGateway({
  port: 8080,
  jwtManager,
  // No Redis - uses in-memory implementations
});

// Gateway is now ready for testing
```

## Client Connection

### Using Query Parameter (Recommended for browsers)

```javascript
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Using Authorization Header

```javascript
const token = 'your-jwt-token';
const ws = new WebSocket('ws://localhost:8080/ws');

// Note: Not all browsers support custom headers for WebSocket
// Use query parameter for browser clients
```

### Connection Acknowledgment

Upon successful connection, the server sends an acknowledgment:

```json
{
  "type": "connected",
  "connectionId": "conn_1234567890_abcdef",
  "userId": "user123"
}
```

## Events

The gateway publishes the following events via the event bus:

### `user.connected`

Published when a user successfully connects.

```json
{
  "userId": "user123",
  "username": "testuser",
  "connectionId": "conn_1234567890_abcdef",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `user.disconnected`

Published when a user disconnects.

```json
{
  "userId": "user123",
  "username": "testuser",
  "connectionId": "conn_1234567890_abcdef",
  "timestamp": "2024-01-01T00:10:00.000Z"
}
```

## Presence Tracking

Check if a user is online:

```typescript
const isOnline = await gateway.presenceTracker.isOnline('user123');
```

Get all connections for a user:

```typescript
const presences = await gateway.presenceTracker.getPresence('user123');
```

## Event Bus

Subscribe to events:

```typescript
gateway.eventBus.subscribe('user.connected', (payload) => {
  console.log(`User ${payload.username} connected`);
});

gateway.eventBus.subscribe('user.disconnected', (payload) => {
  console.log(`User ${payload.username} disconnected`);
});
```

Publish custom events:

```typescript
await gateway.eventBus.publish('custom.event', {
  data: 'your data',
});
```

## Running Tests

### Unit Tests

Unit tests mock all dependencies and test individual components:

```bash
npm test -- src/main/realtime/__tests__/event-bus.test.ts
npm test -- src/main/realtime/__tests__/presence.test.ts
npm test -- src/main/realtime/__tests__/connectionHandler.test.ts
```

### Integration Tests

Integration tests start a real WebSocket server and test end-to-end:

```bash
npm test -- src/main/realtime/__tests__/gateway.integration.test.ts
```

### Run All Realtime Tests

```bash
npm test -- src/main/realtime/__tests__/
```

### Run with Coverage

```bash
npm run test:coverage -- src/main/realtime/
```

## Production Considerations

### Redis Integration

For multi-instance deployments, use Redis for presence tracking:

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const gateway = setupWebSocketGateway({
  port: 8080,
  jwtManager,
  redis, // Enables Redis-backed presence tracking
});
```

### Error Codes

The gateway uses the following WebSocket close codes:

- `1000`: Normal closure
- `4000`: General connection error
- `4001`: Invalid or expired token

### Security

- Always use WSS (WebSocket Secure) in production
- Tokens are verified on every connection
- Expired tokens are rejected
- Connection metadata is tracked for auditing

## API Reference

### `setupWebSocketGateway(config)`

Creates a complete WebSocket gateway setup.

**Config:**
- `port?: number` - Server port (default: 8080)
- `jwtManager: JWTManager` - JWT manager instance (required)
- `redis?: Redis` - Redis client for production presence tracking
- `eventBus?: EventBus` - Custom event bus implementation
- `presenceTracker?: PresenceTracker` - Custom presence tracker

**Returns:**
```typescript
{
  gateway: WebSocketGateway,
  eventBus: EventBus,
  presenceTracker: PresenceTracker,
  close: () => Promise<void>
}
```

### `WebSocketGateway`

Main gateway class.

**Methods:**
- `getConnectionCount(): number` - Get active connection count
- `getAllConnections(): ConnectionContext[]` - Get all connections
- `close(): Promise<void>` - Shutdown gateway gracefully

### `PresenceTracker`

**Methods:**
- `markConnected(presence): Promise<void>` - Mark user as connected
- `markDisconnected(userId, connectionId): Promise<void>` - Mark user as disconnected
- `getPresence(userId): Promise<PresenceData[]>` - Get user's connections
- `isOnline(userId): Promise<boolean>` - Check if user is online
- `close(): Promise<void>` - Close tracker

### `EventBus`

**Methods:**
- `publish(topic, payload): Promise<void>` - Publish event
- `subscribe(topic, handler): void` - Subscribe to topic
- `unsubscribe(topic, handler): void` - Unsubscribe from topic
- `close(): Promise<void>` - Close event bus

## Troubleshooting

### Connection Refused

Ensure the gateway is running and the port is correct.

### Token Validation Fails

- Check that the JWT secret matches between auth module and gateway
- Ensure token is not expired
- Verify token format (should be `Bearer <token>` in headers or `?token=<token>` in query)

### Presence Not Updated

- Check Redis connection if using Redis mode
- Verify presence tracker is properly initialized
- Check logs for errors in presence tracking

## License

MIT
