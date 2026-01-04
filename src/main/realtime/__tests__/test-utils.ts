/**
 * Test Utilities and Mocks
 */

import { JWTManager } from "../../auth/jwt-oauth";
import { AuthConfiguration } from "../../auth/types";
import { RedisClient, EventBus, EventPayload, EventTopic } from "../types";

/**
 * Mock Redis Client
 */
export class MockRedisClient implements RedisClient {
  private data: Map<string, string> = new Map();
  private streams: Map<string, any[]> = new Map();

  async xadd(key: string, id: string, ...args: string[]): Promise<string> {
    const streamId = id === "*" ? `${Date.now()}-0` : id;
    
    if (!this.streams.has(key)) {
      this.streams.set(key, []);
    }
    
    const entry: any = { id: streamId };
    for (let i = 0; i < args.length; i += 2) {
      entry[args[i]] = args[i + 1];
    }
    
    this.streams.get(key)!.push(entry);
    return streamId;
  }

  async del(key: string): Promise<number> {
    if (this.data.has(key)) {
      this.data.delete(key);
      return 1;
    }
    return 0;
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    this.data.set(key, value);
    // In real implementation, would expire after seconds
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async quit(): Promise<void> {
    this.data.clear();
    this.streams.clear();
  }

  // Test helpers
  getStream(key: string): any[] {
    return this.streams.get(key) || [];
  }

  clearAll(): void {
    this.data.clear();
    this.streams.clear();
  }
}

/**
 * Mock EventBus
 */
export class MockEventBus implements EventBus {
  private events: EventPayload[] = [];

  async publish(topic: EventTopic, payload: EventPayload): Promise<void> {
    this.events.push(payload);
  }

  async close(): Promise<void> {
    this.events = [];
  }

  // Test helpers
  getEvents(): EventPayload[] {
    return [...this.events];
  }

  getEventsByTopic(topic: EventTopic): EventPayload[] {
    return this.events.filter(e => e.topic === topic);
  }

  clearEvents(): void {
    this.events = [];
  }
}

/**
 * Create test JWT Manager
 */
export function createTestJWTManager(): JWTManager {
  const testConfig: AuthConfiguration = {
    jwtSecret: "test-secret-key-32-chars-minimum-!!",
    jwtExpiresIn: 900,
    refreshTokenExpiresIn: 604800,
    passwordHashAlgorithm: "bcrypt",
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    mfaRequired: false,
    mfaMethods: ["totp"],
    sessionMaxAge: 3600,
    sessionAbsoluteTimeout: 604800,
    loginAttemptMaxFails: 5,
    loginAttemptLockoutDuration: 900,
    enableOAuth: false,
    oauthProviders: [],
  };

  return new JWTManager(testConfig);
}

/**
 * Create test user
 */
export function createTestUser(overrides?: any) {
  return {
    id: overrides?.id || "test-user-123",
    email: overrides?.email || "test@example.com",
    username: overrides?.username || "testuser",
    displayName: overrides?.displayName || "Test User",
    passwordHash: "hashed-password",
    role: overrides?.role || ("user" as const),
    permissions: overrides?.permissions || [],
    profileImageUrl: undefined,
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    metadata: {},
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
