/**
 * WebSocketGateway Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { WebSocketGateway } from "../gateway";
import { GatewayConfig } from "../types";
import {
  MockRedisClient,
  MockEventBus,
  createTestJWTManager,
  createTestUser,
  waitFor,
} from "./test-utils";
import { PresenceTracker } from "../presence-tracker";

describe("WebSocketGateway", () => {
  let gateway: WebSocketGateway;
  let jwtManager: ReturnType<typeof createTestJWTManager>;
  let eventBus: MockEventBus;
  let redis: MockRedisClient;
  let presenceTracker: PresenceTracker;
  let config: GatewayConfig;

  beforeEach(() => {
    jwtManager = createTestJWTManager();
    eventBus = new MockEventBus();
    redis = new MockRedisClient();
    presenceTracker = new PresenceTracker(redis, "presence:stream", 300);

    config = {
      port: 8080,
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

    gateway = new WebSocketGateway(jwtManager, eventBus, presenceTracker, config);
  });

  afterEach(async () => {
    if (gateway) {
      await gateway.stop();
    }
  });

  describe("start", () => {
    it("should start the WebSocket server", async () => {
      await gateway.start();

      const stats = gateway.getStats();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("authentication", () => {
    it("should authenticate client with valid JWT", async () => {
      await gateway.start();

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      // Create client
      const client = new WebSocket(`ws://localhost:${config.port}`);

      // Wait for connection
      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      // Send auth message
      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      // Wait for auth response
      const response = await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(response.type).toBe("auth");
      expect(response.payload.success).toBe(true);
      expect(response.payload.connectionId).toBeDefined();

      // Verify connection is tracked
      const connections = gateway.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].userId).toBe(testUser.id);

      client.close();
    });

    it("should reject client with invalid JWT", async () => {
      await gateway.start();

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      // Send auth message with invalid token
      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token: "invalid-token" },
        })
      );

      // Wait for error response
      const response = await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(response.type).toBe("error");
      expect(response.payload.message).toContain("Invalid or expired token");
    });

    it("should reject client without token", async () => {
      await gateway.start();

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      // Send auth message without token
      client.send(
        JSON.stringify({
          type: "auth",
          payload: {},
        })
      );

      // Wait for error response
      const response = await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(response.type).toBe("error");
      expect(response.payload.message).toContain("Token missing");
    });

    it("should timeout if client does not authenticate", async () => {
      await gateway.start();

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      // Don't send auth message, wait for timeout
      const closePromise = new Promise<void>((resolve) => {
        client.on("close", resolve);
      });

      // Should close within 10 seconds + buffer
      await expect(closePromise).resolves.toBeDefined();
    }, 15000);
  });

  describe("presence tracking", () => {
    it("should track presence on successful authentication", async () => {
      await gateway.start();

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      // Wait for auth response
      await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      // Check presence is tracked
      const stream = redis.getStream("presence:stream");
      expect(stream.length).toBeGreaterThan(0);
      
      const connectEvent = stream.find(e => e.status === "online");
      expect(connectEvent).toBeDefined();
      expect(connectEvent.userId).toBe(testUser.id);

      client.close();
    });

    it("should clean up presence on disconnect", async () => {
      await gateway.start();

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      const authResponse = await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      const connectionId = authResponse.payload.connectionId;

      // Close connection
      client.close();

      // Wait for disconnect to be processed
      await waitFor(() => gateway.getConnections().length === 0, 5000);

      // Verify presence was cleaned up
      const presence = await presenceTracker.getPresence(testUser.id, connectionId);
      expect(presence).toBeNull();

      // Verify disconnect event in stream
      const stream = redis.getStream("presence:stream");
      const disconnectEvent = stream.find(e => e.status === "offline");
      expect(disconnectEvent).toBeDefined();
    });
  });

  describe("event publishing", () => {
    it("should publish user.connected event", async () => {
      await gateway.start();

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      // Wait for auth
      await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      // Check event was published
      const events = eventBus.getEventsByTopic("user.connected");
      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe(testUser.id);

      client.close();
    });

    it("should publish user.disconnected event", async () => {
      await gateway.start();

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      // Close connection
      client.close();

      // Wait for disconnect to be processed
      await waitFor(() => {
        const events = eventBus.getEventsByTopic("user.disconnected");
        return events.length > 0;
      }, 5000);

      const disconnectEvents = eventBus.getEventsByTopic("user.disconnected");
      expect(disconnectEvents).toHaveLength(1);
      expect(disconnectEvents[0].userId).toBe(testUser.id);
    });
  });

  describe("ping/pong", () => {
    it("should respond to ping with pong", async () => {
      await gateway.start();

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      // Wait for auth response
      await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      // Send ping
      client.send(
        JSON.stringify({
          type: "ping",
        })
      );

      // Wait for pong
      const pongResponse = await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === "pong") {
            resolve(msg);
          }
        });
      });

      expect(pongResponse.type).toBe("pong");
      expect(pongResponse.timestamp).toBeDefined();

      client.close();
    });
  });

  describe("getStats", () => {
    it("should return gateway statistics", () => {
      const stats = gateway.getStats();

      expect(stats.totalConnections).toBeDefined();
      expect(stats.authenticatedConnections).toBeDefined();
      expect(stats.totalEventsPublished).toBeDefined();
      expect(stats.uptime).toBeDefined();
    });

    it("should track connection count", async () => {
      await gateway.start();

      const initialStats = gateway.getStats();
      expect(initialStats.totalConnections).toBe(0);
      expect(initialStats.authenticatedConnections).toBe(0);

      const testUser = createTestUser();
      const token = jwtManager.generateAccessToken(testUser);

      const client = new WebSocket(`ws://localhost:${config.port}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(
        JSON.stringify({
          type: "auth",
          payload: { token },
        })
      );

      await new Promise<any>((resolve) => {
        client.on("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      const statsAfterConnect = gateway.getStats();
      expect(statsAfterConnect.totalConnections).toBe(1);
      expect(statsAfterConnect.authenticatedConnections).toBe(1);

      client.close();
    });
  });
});
