/**
 * Connection Handler
 * 
 * Handles authenticated WebSocket connection lifecycle:
 * - Connection authentication
 * - Presence tracking
 * - Event publishing (user.connected / user.disconnected)
 */

import { WebSocket } from 'ws';
import { JWTManager, JWTPayload } from '../../auth';
import { PresenceTracker } from '../presence';
import { EventBus } from '../event-bus';

export interface ConnectionContext {
  connectionId: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  connectedAt: Date;
  ws: WebSocket;
}

export interface ConnectionHandlerConfig {
  jwtManager: JWTManager;
  presenceTracker: PresenceTracker;
  eventBus: EventBus;
}

/**
 * Connection handler manages the lifecycle of authenticated WebSocket connections
 */
export class ConnectionHandler {
  private config: ConnectionHandlerConfig;
  private connections: Map<string, ConnectionContext>;

  constructor(config: ConnectionHandlerConfig) {
    this.config = config;
    this.connections = new Map();
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: WebSocket, token: string): Promise<ConnectionContext | null> {
    try {
      // Verify JWT token
      const payload = this.config.jwtManager.verifyAccessToken(token);
      if (!payload) {
        ws.close(4001, 'Invalid or expired token');
        return null;
      }

      // Create connection context
      const connectionId = this.generateConnectionId();
      const context: ConnectionContext = {
        connectionId,
        userId: payload.sub,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        connectedAt: new Date(),
        ws,
      };

      // Store connection
      this.connections.set(connectionId, context);

      // Mark user as connected in presence tracker
      await this.config.presenceTracker.markConnected({
        userId: context.userId,
        connectionId: context.connectionId,
        connectedAt: context.connectedAt,
        metadata: {
          username: context.username,
          role: context.role,
        },
      });

      // Publish user.connected event
      await this.config.eventBus.publish('user.connected', {
        userId: context.userId,
        username: context.username,
        connectionId: context.connectionId,
        timestamp: context.connectedAt.toISOString(),
      });

      // Set up disconnection handler
      ws.on('close', () => this.handleDisconnection(connectionId));

      // Send connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId: context.connectionId,
        userId: context.userId,
      }));

      return context;
    } catch (error) {
      console.error('Error handling connection:', error);
      ws.close(4000, 'Connection error');
      return null;
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnection(connectionId: string): Promise<void> {
    const context = this.connections.get(connectionId);
    if (!context) {
      return;
    }

    try {
      // Mark user as disconnected in presence tracker
      await this.config.presenceTracker.markDisconnected(
        context.userId,
        context.connectionId
      );

      // Publish user.disconnected event
      await this.config.eventBus.publish('user.disconnected', {
        userId: context.userId,
        username: context.username,
        connectionId: context.connectionId,
        timestamp: new Date().toISOString(),
      });

      // Remove connection
      this.connections.delete(connectionId);
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): ConnectionContext | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): ConnectionContext[] {
    return Array.from(this.connections.values()).filter(
      ctx => ctx.userId === userId
    );
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ConnectionContext[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(
      async (context) => {
        try {
          context.ws.close(1000, 'Server shutdown');
          await this.handleDisconnection(context.connectionId);
        } catch (error) {
          console.error('Error closing connection:', error);
        }
      }
    );

    await Promise.all(closePromises);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Create connection handler
 */
export function createConnectionHandler(
  config: ConnectionHandlerConfig
): ConnectionHandler {
  return new ConnectionHandler(config);
}
