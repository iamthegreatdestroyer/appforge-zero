/**
 * WebSocket Gateway
 *
 * Main WebSocket server that:
 * - Authenticates clients using JWT
 * - Tracks presence via Redis
 * - Publishes connection events to event bus
 */

import { WebSocket, WebSocketServer } from "ws";
import { Server as HTTPServer } from "http";
import { JWTManager } from "../auth/jwt-oauth";
import { EventBus } from "./event-bus";
import { PresenceTracker } from "./presence-tracker";
import {
  GatewayConfig,
  WSConnection,
  WSMessage,
  AuthResult,
  GatewayStats,
} from "./types";
import * as crypto from "crypto";

/**
 * WebSocket Gateway Service
 */
export class WebSocketGateway {
  private wss: WebSocketServer | null = null;
  private jwtManager: JWTManager;
  private eventBus: EventBus;
  private presenceTracker: PresenceTracker;
  private config: GatewayConfig;
  private connections: Map<string, WSConnection> = new Map();
  private stats: GatewayStats = {
    totalConnections: 0,
    authenticatedConnections: 0,
    totalEventsPublished: 0,
    uptime: 0,
  };
  private startTime: number = 0;

  constructor(
    jwtManager: JWTManager,
    eventBus: EventBus,
    presenceTracker: PresenceTracker,
    config: GatewayConfig
  ) {
    this.jwtManager = jwtManager;
    this.eventBus = eventBus;
    this.presenceTracker = presenceTracker;
    this.config = config;
  }

  /**
   * Start the WebSocket server
   */
  async start(server?: HTTPServer): Promise<void> {
    this.startTime = Date.now();

    const options: any = server
      ? { server }
      : { port: this.config.port };

    this.wss = new WebSocketServer(options);

    this.wss.on("connection", (socket: WebSocket, request) => {
      this.handleConnection(socket, request);
    });

    console.log(
      `[WebSocketGateway] Started on ${server ? "HTTP server" : `port ${this.config.port}`}`
    );
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.wss) {
      return;
    }

    // Close all connections
    for (const [connId, connection] of this.connections) {
      await this.handleDisconnect(connId, connection);
      connection.socket.close();
    }

    // Close the server
    return new Promise((resolve) => {
      this.wss!.close(() => {
        console.log("[WebSocketGateway] Stopped");
        resolve();
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: WebSocket, request: any): Promise<void> {
    const connectionId = this.generateConnectionId();
    this.stats.totalConnections++;

    console.log(`[WebSocketGateway] New connection: ${connectionId}`);

    // Wait for authentication message
    let isAuthenticated = false;
    let authTimeout: NodeJS.Timeout | null = null;

    const handleAuth = async (data: Buffer) => {
      if (isAuthenticated) {
        return;
      }

      try {
        const message: WSMessage = JSON.parse(data.toString());

        if (message.type !== "auth") {
          socket.send(
            JSON.stringify({
              type: "error",
              payload: { message: "Authentication required" },
            })
          );
          socket.close();
          return;
        }

        const token = message.payload?.token;
        if (!token) {
          socket.send(
            JSON.stringify({
              type: "error",
              payload: { message: "Token missing" },
            })
          );
          socket.close();
          return;
        }

        // Authenticate with JWT
        const authResult = this.authenticate(token);
        if (!authResult.success || !authResult.payload) {
          socket.send(
            JSON.stringify({
              type: "error",
              payload: { message: authResult.error || "Authentication failed" },
            })
          );
          socket.close();
          return;
        }

        // Authentication successful
        isAuthenticated = true;
        if (authTimeout) {
          clearTimeout(authTimeout);
        }

        const connection: WSConnection = {
          id: connectionId,
          userId: authResult.payload.sub,
          socket,
          authenticatedAt: new Date(),
          metadata: {
            userAgent: request.headers["user-agent"],
            ipAddress: request.socket.remoteAddress,
          },
        };

        this.connections.set(connectionId, connection);
        this.stats.authenticatedConnections++;

        // Track presence
        await this.presenceTracker.trackConnection(
          connection.userId,
          connectionId,
          connection.metadata
        );

        // Publish user.connected event
        await this.publishEvent("user.connected", connection);

        // Send auth success
        socket.send(
          JSON.stringify({
            type: "auth",
            payload: { success: true, connectionId },
          })
        );

        console.log(
          `[WebSocketGateway] Authenticated: userId=${connection.userId}, connId=${connectionId}`
        );

        // Setup message handlers for authenticated connection
        socket.removeListener("message", handleAuth);
        socket.on("message", (data: Buffer) => this.handleMessage(connectionId, data));
        socket.on("close", () => this.handleDisconnect(connectionId, connection));
        socket.on("error", (error) => this.handleError(connectionId, error));
      } catch (error) {
        console.error("[WebSocketGateway] Auth error:", error);
        socket.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Invalid message format" },
          })
        );
        socket.close();
      }
    };

    socket.on("message", handleAuth);

    // Set authentication timeout (10 seconds)
    authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log(`[WebSocketGateway] Auth timeout: ${connectionId}`);
        socket.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Authentication timeout" },
          })
        );
        socket.close();
      }
    }, 10000);
  }

  /**
   * Authenticate JWT token
   */
  private authenticate(token: string): AuthResult {
    const payload = this.jwtManager.verifyAccessToken(token);

    if (!payload) {
      return {
        success: false,
        error: "Invalid or expired token",
      };
    }

    return {
      success: true,
      payload,
    };
  }

  /**
   * Handle messages from authenticated clients
   */
  private async handleMessage(connectionId: string, data: Buffer): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      const message: WSMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "ping":
          // Respond with pong
          connection.socket.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date(),
            })
          );
          // Update last seen
          await this.presenceTracker.updateLastSeen(connection.userId, connectionId);
          break;

        default:
          console.log(`[WebSocketGateway] Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      console.error("[WebSocketGateway] Message handling error:", error);
    }
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnect(
    connectionId: string,
    connection: WSConnection
  ): Promise<void> {
    console.log(`[WebSocketGateway] Disconnect: ${connectionId}`);

    // Clean up presence
    await this.presenceTracker.cleanupConnection(connection.userId, connectionId);

    // Publish user.disconnected event
    await this.publishEvent("user.disconnected", connection);

    // Remove connection
    this.connections.delete(connectionId);
    this.stats.authenticatedConnections--;
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(connectionId: string, error: Error): void {
    console.error(`[WebSocketGateway] Error on connection ${connectionId}:`, error);
  }

  /**
   * Publish an event to the event bus
   */
  private async publishEvent(topic: string, connection: WSConnection): Promise<void> {
    await this.eventBus.publish(topic, {
      topic,
      userId: connection.userId,
      connectionId: connection.id,
      timestamp: new Date(),
      data: connection.metadata,
    });

    this.stats.totalEventsPublished++;
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  /**
   * Get current gateway stats
   */
  getStats(): GatewayStats {
    return {
      ...this.stats,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Get all active connections
   */
  getConnections(): WSConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WSConnection | undefined {
    return this.connections.get(connectionId);
  }
}

/**
 * Create a WebSocket Gateway instance
 */
export function createWebSocketGateway(
  jwtManager: JWTManager,
  eventBus: EventBus,
  presenceTracker: PresenceTracker,
  config: GatewayConfig
): WebSocketGateway {
  return new WebSocketGateway(jwtManager, eventBus, presenceTracker, config);
}
