/**
 * Integration Tests for WebSocket Gateway
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { setupWebSocketGateway, WebSocketGatewaySetup } from '../index';
import { JWTManager } from '../../auth/jwt-oauth';
import { User, UserRole, AuthConfiguration } from '../../auth/types';

describe('WebSocket Gateway Integration', () => {
  let gateway: WebSocketGatewaySetup;
  let jwtManager: JWTManager;
  let mockUser: User;
  let port: number;
  let authConfig: AuthConfiguration;

  beforeEach(async () => {
    // Use a random port for testing
    port = 8000 + Math.floor(Math.random() * 1000);

    authConfig = {
      jwtSecret: 'test-secret-key-for-jwt-integration',
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

    // Create gateway setup
    gateway = setupWebSocketGateway({
      port,
      jwtManager,
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    if (gateway) {
      await gateway.close();
    }
  });

  it('should accept connection with valid JWT token', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    
    const client = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    const connectionPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      
      client.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    await connectionPromise;
    
    expect(client.readyState).toBe(WebSocket.OPEN);
    client.close();
  });

  it('should reject connection without token', async () => {
    const client = new WebSocket(`ws://localhost:${port}/ws`);
    
    const closePromise = new Promise<{ code: number, reason: string }>((resolve) => {
      client.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    const { code } = await closePromise;
    expect(code).toBe(4001);
  });

  it('should reject connection with invalid token', async () => {
    const client = new WebSocket(`ws://localhost:${port}/ws?token=invalid-token`);
    
    const closePromise = new Promise<{ code: number }>((resolve) => {
      client.on('close', (code) => {
        resolve({ code });
      });
    });

    const { code } = await closePromise;
    expect(code).toBe(4001);
  });

  it('should send connection acknowledgment', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    const client = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    const messagePromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Message timeout')), 5000);
      
      client.on('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
      
      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const message = await messagePromise;
    
    expect(message.type).toBe('connected');
    expect(message.userId).toBe('user123');
    expect(message.connectionId).toBeDefined();
    
    client.close();
  });

  it('should track presence on connect', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    const client = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      client.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Wait for presence to be written
    await new Promise(resolve => setTimeout(resolve, 100));

    const isOnline = await gateway.presenceTracker.isOnline('user123');
    expect(isOnline).toBe(true);
    
    client.close();
  });

  it('should publish user.connected event', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    const eventHandler = vi.fn();

    gateway.eventBus.subscribe('user.connected', eventHandler);

    const client = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      client.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Wait for event to be published
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        username: 'testuser',
      })
    );
    
    client.close();
  });

  it('should publish user.disconnected event on disconnect', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    const eventHandler = vi.fn();

    gateway.eventBus.subscribe('user.disconnected', eventHandler);

    const client = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      client.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Close connection
    client.close();

    // Wait for disconnection to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        username: 'testuser',
      })
    );
  });

  it('should remove presence on disconnect', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    const client = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      client.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Verify online
    await new Promise(resolve => setTimeout(resolve, 100));
    let isOnline = await gateway.presenceTracker.isOnline('user123');
    expect(isOnline).toBe(true);

    // Close connection
    client.close();

    // Wait for disconnection to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    isOnline = await gateway.presenceTracker.isOnline('user123');
    expect(isOnline).toBe(false);
  });

  it('should support multiple simultaneous connections', async () => {
    const token = jwtManager.generateAccessToken(mockUser);
    
    const client1 = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    const client2 = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
    
    // Wait for both connections
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        client1.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
      }),
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        client2.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
      }),
    ]);

    // Wait for presence to be written
    await new Promise(resolve => setTimeout(resolve, 100));

    const presences = await gateway.presenceTracker.getPresence('user123');
    expect(presences.length).toBeGreaterThanOrEqual(2);
    
    client1.close();
    client2.close();
  });
});
