/**
 * Authentication Middleware & Request Context
 *
 * Provides:
 * - Bearer token authentication
 * - Authorization context injection
 * - Permission checking middleware
 * - Request context types
 */

import { JWTManager } from './jwt-oauth';
import { AuthenticationService } from './authentication.service';
import { AuthorizationService } from './authorization.service';
import { UserService } from './user.service';
import { AuthorizationContext, JWTPayload, User, Permission } from './types';

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate request from bearer token
 */
export async function authenticateRequest(
  authHeader: string | undefined,
  jwtManager: JWTManager,
  userService: UserService,
  sessionId: string
): Promise<AuthorizationContext | null> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  const payload = jwtManager.verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  const user = await userService.getUserById(payload.sub);
  if (!user || !user.isActive) {
    return null;
  }

  return {
    userId: user.id,
    user,
    sessionId,
    isAuthenticated: true,
    role: user.role,
    permissions: new Set(user.permissions),
  };
}

/**
 * Check authorization before executing action
 */
export async function requireAuth(
  context: AuthorizationContext | null,
  requiredRole?: string
): Promise<boolean> {
  if (!context || !context.isAuthenticated) {
    return false;
  }

  if (requiredRole && context.role !== requiredRole) {
    return false;
  }

  return true;
}

/**
 * Check permission before executing action
 */
export async function requirePermission(
  context: AuthorizationContext | null,
  permission: Permission,
  authService?: AuthorizationService
): Promise<boolean> {
  if (!context || !context.isAuthenticated) {
    return false;
  }

  // Check explicit permission
  if (context.permissions.has(permission)) {
    return true;
  }

  // Check with auth service if provided
  if (authService) {
    return authService.hasPermission(context.user, permission);
  }

  return false;
}

/**
 * Check any of multiple permissions
 */
export async function requireAnyPermission(
  context: AuthorizationContext | null,
  permissions: Permission[],
  authService?: AuthorizationService
): Promise<boolean> {
  if (!context || !context.isAuthenticated) {
    return false;
  }

  for (const permission of permissions) {
    if (await requirePermission(context, permission, authService)) {
      return true;
    }
  }

  return false;
}

/**
 * Check all permissions
 */
export async function requireAllPermissions(
  context: AuthorizationContext | null,
  permissions: Permission[],
  authService?: AuthorizationService
): Promise<boolean> {
  if (!context || !context.isAuthenticated) {
    return false;
  }

  for (const permission of permissions) {
    if (!(await requirePermission(context, permission, authService))) {
      return false;
    }
  }

  return true;
}

/**
 * Check admin role
 */
export async function requireAdmin(
  context: AuthorizationContext | null
): Promise<boolean> {
  if (!context || !context.isAuthenticated) {
    return false;
  }

  return context.role === 'admin';
}

/**
 * Request guard decorator
 */
export function AuthGuard(requiredPermission?: Permission) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = this.authContext as AuthorizationContext | null;

      if (!context || !context.isAuthenticated) {
        throw new Error('Authentication required');
      }

      if (requiredPermission) {
        const hasPermission = await requirePermission(
          context,
          requiredPermission,
          this.authService
        );

        if (!hasPermission) {
          throw new Error(`Permission required: ${requiredPermission}`);
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Admin guard decorator
 */
export function AdminGuard(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const context = this.authContext as AuthorizationContext | null;

    if (!context || !context.isAuthenticated) {
      throw new Error('Authentication required');
    }

    if (context.role !== 'admin') {
      throw new Error('Admin access required');
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Context-aware request handler
 */
export class AuthenticatedRequest {
  authContext: AuthorizationContext;

  constructor(context: AuthorizationContext) {
    this.authContext = context;
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    return this.authContext.userId;
  }

  /**
   * Get user
   */
  getUser(): User {
    return this.authContext.user;
  }

  /**
   * Check permission
   */
  async hasPermission(
    permission: Permission,
    authService?: AuthorizationService
  ): Promise<boolean> {
    return requirePermission(this.authContext, permission, authService);
  }

  /**
   * Check any permission
   */
  async hasAnyPermission(
    permissions: Permission[],
    authService?: AuthorizationService
  ): Promise<boolean> {
    return requireAnyPermission(this.authContext, permissions, authService);
  }

  /**
   * Check all permissions
   */
  async hasAllPermissions(
    permissions: Permission[],
    authService?: AuthorizationService
  ): Promise<boolean> {
    return requireAllPermissions(this.authContext, permissions, authService);
  }

  /**
   * Is admin
   */
  isAdmin(): boolean {
    return this.authContext.role === 'admin';
  }

  /**
   * Check owner
   */
  isOwner(ownerId: string): boolean {
    return this.authContext.userId === ownerId;
  }
}

/**
 * Rate limiting tracker
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly window: number; // milliseconds
  private readonly maxAttempts: number;

  constructor(window: number = 60000, maxAttempts: number = 60) {
    this.window = window;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const filtered = attempts.filter((time) => now - time < this.window);

    // Check if within limit
    if (filtered.length >= this.maxAttempts) {
      return false;
    }

    // Record this attempt
    filtered.push(now);
    this.attempts.set(key, filtered);

    return true;
  }

  /**
   * Get remaining attempts
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    const filtered = attempts.filter((time) => now - time < this.window);

    return Math.max(0, this.maxAttempts - filtered.length);
  }

  /**
   * Reset key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear old entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, attempts] of this.attempts.entries()) {
      const filtered = attempts.filter((time) => now - time < this.window);

      if (filtered.length === 0) {
        keysToDelete.push(key);
      } else {
        this.attempts.set(key, filtered);
      }
    }

    for (const key of keysToDelete) {
      this.attempts.delete(key);
    }
  }
}

/**
 * Create rate limiter
 */
export function createRateLimiter(
  window?: number,
  maxAttempts?: number
): RateLimiter {
  return new RateLimiter(window, maxAttempts);
}
