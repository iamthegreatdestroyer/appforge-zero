/**
 * Unit Tests for Connection Handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionHandler } from '../handlers/connectionHandler';
import { InMemoryPresenceTracker } from '../presence';
import { InMemoryEventBus } from '../event-bus';
import { JWTManager } from '../../auth/jwt-oauth';
import { User, UserRole, AuthConfiguration } from '../../auth/types';

// Mock WebSocket
class MockWebSocket {
  public readyState = 1; // OPEN
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  send(data: string) {
    // Mock send
  }

  close(code: number, reason: string) {
    // Mock close
    const closeHandlers = this.listeners.get('close') || [];
    closeHandlers.forEach(h => h());
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h(...args));
  }
}

describe('ConnectionHandler', () => {
  let jwtManager: JWTManager;
  let presenceTracker: InMemoryPresenceTracker;
  let eventBus: InMemoryEventBus;
  let connectionHandler: ConnectionHandler;
  let mockUser: User;
  let authConfig: AuthConfiguration;

  beforeEach(() => {
    authConfig = {
      jwtSecret: 'test-secret-key-for-jwt',
      jwtExpiresIn: 900,
      refreshTokenExpiresIn: 604800,
      passwordHashAlgorithm: 'bcrypt',
      passwordMinLength: 8,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: true,
      mfaRequired: false,
      mfaMethods: ['totp'],
      sessionMaxAge: 3600,
      sessionAbsoluteTimeout: 604800,
      loginAttemptMaxFails: 5,
      loginAttemptLockoutDuration: 900,
      enableOAuth: false,
      oauthProviders: [],
    };

    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      passwordHash: 'hashed',
      role: 'user' as UserRole,
      permissions: [],
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jwtManager = new JWTManager(authConfig);
    presenceTracker = new InMemoryPresenceTracker();
    eventBus = new InMemoryEventBus();
    connectionHandler = new ConnectionHandler({
      jwtManager,
      presenceTracker,
      eventBus,
    });
  });

  describe('handleConnection', () => {
    it('should accept valid JWT token', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;

      const context = await connectionHandler.handleConnection(ws, token);

      expect(context).not.toBeNull();
      expect(context!.userId).toBe('user123');
      expect(context!.username).toBe('testuser');
      expect(context!.email).toBe('test@example.com');
    });

    it('should reject invalid token', async () => {
      const ws = new MockWebSocket() as any;
      const closeSpy = vi.spyOn(ws, 'close');

      const context = await connectionHandler.handleConnection(ws, 'invalid-token');

      expect(context).toBeNull();
      expect(closeSpy).toHaveBeenCalledWith(4001, 'Invalid or expired token');
    });

    it('should reject expired token', async () => {
      // Create token with negative expiration (already expired)
      const expiredConfig = { ...authConfig, jwtExpiresIn: -1 };
      const expiredJwtManager = new JWTManager(expiredConfig);
      const token = expiredJwtManager.generateAccessToken(mockUser);

      const ws = new MockWebSocket() as any;
      const closeSpy = vi.spyOn(ws, 'close');

      const context = await connectionHandler.handleConnection(ws, token);

      expect(context).toBeNull();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should write presence on connect', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;

      await connectionHandler.handleConnection(ws, token);

      const isOnline = await presenceTracker.isOnline('user123');
      expect(isOnline).toBe(true);

      const presences = await presenceTracker.getPresence('user123');
      expect(presences).toHaveLength(1);
      expect(presences[0].userId).toBe('user123');
    });

    it('should publish user.connected event', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;
      const eventHandler = vi.fn();

      eventBus.subscribe('user.connected', eventHandler);
      await connectionHandler.handleConnection(ws, token);

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          username: 'testuser',
        })
      );
    });

    it('should send connection acknowledgment', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;
      const sendSpy = vi.spyOn(ws, 'send');

      await connectionHandler.handleConnection(ws, token);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('connected');
      expect(sentData.userId).toBe('user123');
    });
  });

  describe('handleDisconnection', () => {
    it('should remove presence on disconnect', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;

      const context = await connectionHandler.handleConnection(ws, token);
      expect(context).not.toBeNull();

      // Trigger disconnect
      ws.close(1000, 'Client disconnect');

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 50));

      const isOnline = await presenceTracker.isOnline('user123');
      expect(isOnline).toBe(false);
    });

    it('should publish user.disconnected event', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;
      const eventHandler = vi.fn();

      eventBus.subscribe('user.disconnected', eventHandler);
      
      const context = await connectionHandler.handleConnection(ws, token);
      expect(context).not.toBeNull();

      // Trigger disconnect
      ws.close(1000, 'Client disconnect');

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          username: 'testuser',
        })
      );
    });

    it('should remove connection from handler', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;

      const context = await connectionHandler.handleConnection(ws, token);
      expect(context).not.toBeNull();
      expect(connectionHandler.getConnectionCount()).toBe(1);

      // Trigger disconnect
      ws.close(1000, 'Client disconnect');

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(connectionHandler.getConnectionCount()).toBe(0);
    });
  });

  describe('connection management', () => {
    it('should track multiple connections', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws1 = new MockWebSocket() as any;
      const ws2 = new MockWebSocket() as any;

      await connectionHandler.handleConnection(ws1, token);
      await connectionHandler.handleConnection(ws2, token);

      expect(connectionHandler.getConnectionCount()).toBe(2);
      
      const userConnections = connectionHandler.getUserConnections('user123');
      expect(userConnections).toHaveLength(2);
    });

    it('should get connection by ID', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws = new MockWebSocket() as any;

      const context = await connectionHandler.handleConnection(ws, token);
      expect(context).not.toBeNull();

      const retrieved = connectionHandler.getConnection(context!.connectionId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.userId).toBe('user123');
    });

    it('should get all connections', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws1 = new MockWebSocket() as any;
      const ws2 = new MockWebSocket() as any;

      await connectionHandler.handleConnection(ws1, token);
      await connectionHandler.handleConnection(ws2, token);

      const allConnections = connectionHandler.getAllConnections();
      expect(allConnections).toHaveLength(2);
    });
  });

  describe('closeAll', () => {
    it('should close all connections', async () => {
      const token = jwtManager.generateAccessToken(mockUser);
      const ws1 = new MockWebSocket() as any;
      const ws2 = new MockWebSocket() as any;

      await connectionHandler.handleConnection(ws1, token);
      await connectionHandler.handleConnection(ws2, token);

      expect(connectionHandler.getConnectionCount()).toBe(2);

      await connectionHandler.closeAll();

      expect(connectionHandler.getConnectionCount()).toBe(0);
    });
  });
});
