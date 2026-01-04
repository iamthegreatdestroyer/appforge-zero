/**
 * WebSocket Gateway
 * 
 * WebSocket server entrypoint that:
 * - Accepts WebSocket connections
 * - Performs JWT authentication
 * - Delegates to ConnectionHandler for lifecycle management
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { ConnectionHandler, createConnectionHandler } from './handlers/connectionHandler';
import { JWTManager } from '../auth';
import { PresenceTracker } from './presence';
import { EventBus } from './event-bus';

export interface WebSocketGatewayConfig {
  port?: number;
  server?: HTTPServer;
  jwtManager: JWTManager;
  presenceTracker: PresenceTracker;
  eventBus: EventBus;
  path?: string;
}

/**
 * WebSocket Gateway
 */
export class WebSocketGateway {
  private wss: WebSocketServer;
  private connectionHandler: ConnectionHandler;
  private config: WebSocketGatewayConfig;

  constructor(config: WebSocketGatewayConfig) {
    this.config = config;

    // Create WebSocket server
    if (config.server) {
      // Attach to existing HTTP server
      this.wss = new WebSocketServer({
        server: config.server,
        path: config.path || '/ws',
      });
    } else {
      // Create standalone server
      this.wss = new WebSocketServer({
        port: config.port || 8080,
        path: config.path || '/ws',
      });
    }

    // Create connection handler
    this.connectionHandler = createConnectionHandler({
      jwtManager: config.jwtManager,
      presenceTracker: config.presenceTracker,
      eventBus: config.eventBus,
    });

    // Set up connection listener
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleNewConnection(ws, req);
    });

    console.log(`WebSocket Gateway started on ${config.server ? 'attached server' : `port ${config.port || 8080}`}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleNewConnection(ws: WebSocket, req: any): Promise<void> {
    try {
      // Extract token from query string or headers
      const token = this.extractToken(req);
      
      if (!token) {
        ws.close(4001, 'Missing authentication token');
        return;
      }

      // Delegate to connection handler
      await this.connectionHandler.handleConnection(ws, token);
    } catch (error) {
      console.error('Error handling new connection:', error);
      ws.close(4000, 'Connection error');
    }
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(req: any): string | null {
    // Try query parameter first (e.g., ?token=xxx)
    if (req.url) {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        return token;
      }
    }

    // Try Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        return match[1];
      }
    }

    // Try Sec-WebSocket-Protocol header (for clients that use subprotocols)
    const protocol = req.headers['sec-websocket-protocol'];
    if (protocol) {
      // Format: "token, <jwt_token>"
      const parts = protocol.split(',').map((p: string) => p.trim());
      if (parts[0] === 'token' && parts[1]) {
        return parts[1];
      }
    }

    return null;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connectionHandler.getConnectionCount();
  }

  /**
   * Get all active connections
   */
  getAllConnections() {
    return this.connectionHandler.getAllConnections();
  }

  /**
   * Close the gateway
   */
  async close(): Promise<void> {
    console.log('Closing WebSocket Gateway...');
    
    // Close all connections gracefully
    await this.connectionHandler.closeAll();
    
    // Close WebSocket server
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          console.error('Error closing WebSocket server:', err);
          reject(err);
        } else {
          console.log('WebSocket Gateway closed');
          resolve();
        }
      });
    });
  }

  /**
   * Get WebSocket server instance (for testing)
   */
  getServer(): WebSocketServer {
    return this.wss;
  }
}

/**
 * Create WebSocket Gateway
 */
export function createWebSocketGateway(
  config: WebSocketGatewayConfig
): WebSocketGateway {
  return new WebSocketGateway(config);
}
