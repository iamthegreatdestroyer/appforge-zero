/**
 * WebSocket Gateway Integration Tests
 *
 * Lightweight integration tests showing:
 * - Authenticated client can connect
 * - Presence is updated in Redis
 * - Events are published to event bus
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { WebSocketGateway, createWebSocketGateway } from "../gateway";
import { InMemoryEventBus } from "../event-bus";
import { PresenceTracker, createPresenceTracker } from "../presence-tracker";
import { GatewayConfig } from "../types";
import {
  MockRedisClient,
  createTestJWTManager,
  createTestUser,
  waitFor,
} from "./test-utils";

describe("WebSocket Gateway Integration", () => {
  let gateway: WebSocketGateway;
  let jwtManager: ReturnType<typeof createTestJWTManager>;
  let eventBus: InMemoryEventBus;
  let redis: MockRedisClient;
  let presenceTracker: PresenceTracker;
  let config: GatewayConfig;

  beforeEach(() => {
    jwtManager = createTestJWTManager();
    eventBus = new InMemoryEventBus();
    redis = new MockRedisClient();
    presenceTracker = createPresenceTracker(redis, "presence:stream", 300);

    config = {
      port: 8081, // Different port to avoid conflicts
      jwtSecret: "test-secret-key-32-chars-minimum-!!",
      redis: {
        host: "localhost",
        port: 6379,
      },
      presence: {
        streamKey: "presence:stream",
        ttl: 300,
      },
    };

    gateway = createWebSocketGateway(jwtManager, eventBus, presenceTracker, config);
  });

  afterEach(async () => {
    if (gateway) {
      await gateway.stop();
    }
    await eventBus.close();
    await redis.quit();
  });

  it("should handle complete authenticated connection flow", async () => {
    // Start the gateway
    await gateway.start();

    // Create a test user and generate JWT
    const testUser = createTestUser({
      id: "user-integration-test",
      email: "integration@example.com",
      username: "integrationuser",
    });
    const token = jwtManager.generateAccessToken(testUser);

    // Create WebSocket client
    const client = new WebSocket(`ws://localhost:${config.port}`);

    // Wait for connection to open
    await new Promise<void>((resolve) => {
      client.on("open", resolve);
    });

    // Send authentication message
    client.send(
      JSON.stringify({
        type: "auth",
        payload: { token },
      })
    );

    // Wait for authentication response
    const authResponse = await new Promise<any>((resolve) => {
      client.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "auth") {
          resolve(msg);
        }
      });
    });

    // Verify authentication succeeded
    expect(authResponse.payload.success).toBe(true);
    expect(authResponse.payload.connectionId).toBeDefined();

    const connectionId = authResponse.payload.connectionId;

    // Verify connection is tracked in gateway
    const connections = gateway.getConnections();
    expect(connections).toHaveLength(1);
    expect(connections[0].userId).toBe(testUser.id);
    expect(connections[0].id).toBe(connectionId);

    // Verify presence is tracked in Redis
    const presence = await presenceTracker.getPresence(testUser.id, connectionId);
    expect(presence).not.toBeNull();
    expect(presence!.userId).toBe(testUser.id);
    expect(presence!.connectionId).toBe(connectionId);
    expect(presence!.status).toBe("online");

    // Verify user.connected event was published
    const connectedEvents = eventBus.getEvents().filter(e => e.topic === "user.connected");
    expect(connectedEvents).toHaveLength(1);
    expect(connectedEvents[0].userId).toBe(testUser.id);
    expect(connectedEvents[0].connectionId).toBe(connectionId);

    // Test ping/pong to verify connection is alive
    client.send(JSON.stringify({ type: "ping" }));

    const pongResponse = await new Promise<any>((resolve) => {
      client.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "pong") {
          resolve(msg);
        }
      });
    });

    expect(pongResponse.type).toBe("pong");

    // Close the connection
    client.close();

    // Wait for disconnect to be processed
    await waitFor(() => gateway.getConnections().length === 0, 5000);

    // Verify presence was cleaned up
    const presenceAfterDisconnect = await presenceTracker.getPresence(
      testUser.id,
      connectionId
    );
    expect(presenceAfterDisconnect).toBeNull();

    // Verify user.disconnected event was published
    const disconnectedEvents = eventBus
      .getEvents()
      .filter(e => e.topic === "user.disconnected");
    expect(disconnectedEvents).toHaveLength(1);
    expect(disconnectedEvents[0].userId).toBe(testUser.id);
    expect(disconnectedEvents[0].connectionId).toBe(connectionId);

    // Verify stats
    const stats = gateway.getStats();
    expect(stats.totalConnections).toBe(1);
    expect(stats.authenticatedConnections).toBe(0); // Should be 0 after disconnect
    expect(stats.totalEventsPublished).toBe(2); // connected + disconnected
  });

  it("should handle multiple concurrent connections", async () => {
    await gateway.start();

    // Create multiple test users
    const users = [
      createTestUser({ id: "user-1", email: "user1@example.com" }),
      createTestUser({ id: "user-2", email: "user2@example.com" }),
      createTestUser({ id: "user-3", email: "user3@example.com" }),
    ];

    const clients: WebSocket[] = [];
    const connectionIds: string[] = [];

    // Connect all users
    for (const user of users) {
      const token = jwtManager.generateAccessToken(user);
      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(JSON.stringify({ type: "auth", payload: { token } }));

      const authResponse = await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === "auth") {
            resolve(msg);
          }
        });
      });

      expect(authResponse.payload.success).toBe(true);
      connectionIds.push(authResponse.payload.connectionId);
      clients.push(client);
    }

    // Verify all connections are tracked
    const connections = gateway.getConnections();
    expect(connections).toHaveLength(3);

    // Verify all presences are tracked
    for (let i = 0; i < users.length; i++) {
      const presence = await presenceTracker.getPresence(users[i].id, connectionIds[i]);
      expect(presence).not.toBeNull();
      expect(presence!.userId).toBe(users[i].id);
    }

    // Verify all connected events were published
    const connectedEvents = eventBus
      .getEvents()
      .filter(e => e.topic === "user.connected");
    expect(connectedEvents).toHaveLength(3);

    // Close all connections
    for (const client of clients) {
      client.close();
    }

    // Wait for all disconnects to be processed
    await waitFor(() => gateway.getConnections().length === 0, 5000);

    // Verify all presences were cleaned up
    for (let i = 0; i < users.length; i++) {
      const presence = await presenceTracker.getPresence(users[i].id, connectionIds[i]);
      expect(presence).toBeNull();
    }

    // Verify all disconnected events were published
    const disconnectedEvents = eventBus
      .getEvents()
      .filter(e => e.topic === "user.disconnected");
    expect(disconnectedEvents).toHaveLength(3);
  });

  it("should reject unauthenticated connection attempts", async () => {
    await gateway.start();

    const client = new WebSocket(`ws://localhost:${config.port}`);

    await new Promise<void>((resolve) => {
      client.on("open", resolve);
    });

    // Send invalid auth
    client.send(
      JSON.stringify({
        type: "auth",
        payload: { token: "invalid-token" },
      })
    );

    // Wait for error and close
    const errorResponse = await new Promise<any>((resolve) => {
      client.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    expect(errorResponse.type).toBe("error");
    expect(errorResponse.payload.message).toBeDefined();

    // Verify connection was not tracked
    const connections = gateway.getConnections();
    expect(connections).toHaveLength(0);

    // Verify no presence was created
    const stream = redis.getStream("presence:stream");
    const onlineEvents = stream.filter(e => e.status === "online");
    expect(onlineEvents).toHaveLength(0);

    // Verify no connected event was published
    const connectedEvents = eventBus
      .getEvents()
      .filter(e => e.topic === "user.connected");
    expect(connectedEvents).toHaveLength(0);
  });
});
