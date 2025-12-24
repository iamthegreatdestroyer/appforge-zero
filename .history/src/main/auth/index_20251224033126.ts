/**
 * Authentication & Authorization Module
 *
 * Complete auth implementation including:
 * - JWT & OAuth2 token management
 * - User registration and profile management
 * - Role-based access control (RBAC)
 * - Multi-factor authentication (MFA)
 * - Session management
 * - Audit logging
 */

// Types
export * from './types';

// JWT & OAuth
export {
  JWTManager,
  RefreshTokenManager,
  OAuth2Manager,
  createJWTManager,
  createRefreshTokenManager,
  createOAuth2Manager,
} from './jwt-oauth';

// User Service
export {
  UserService,
  createUserService,
} from './user.service';

// Authorization Service
export {
  AuthorizationService,
  createAuthorizationService,
} from './authorization.service';

// Authentication Service
export {
  AuthenticationService,
  createAuthenticationService,
} from './authentication.service';

// Middleware & Context
export {
  extractBearerToken,
  authenticateRequest,
  requireAuth,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  AuthGuard,
  AdminGuard,
  AuthenticatedRequest,
  RateLimiter,
  createRateLimiter,
} from './middleware';

/**
 * Auth module configuration
 */
export interface AuthModuleConfig {
  jwtSecret: string;
  jwtExpiresIn?: number;
  refreshTokenExpiresIn?: number;
  passwordHashAlgorithm?: 'bcrypt' | 'argon2';
  passwordMinLength?: number;
  passwordRequireNumbers?: boolean;
  passwordRequireSpecialChars?: boolean;
  mfaRequired?: boolean;
  mfaMethods?: ('email' | 'totp' | 'sms')[];
  sessionMaxAge?: number;
  sessionAbsoluteTimeout?: number;
  loginAttemptMaxFails?: number;
  loginAttemptLockoutDuration?: number;
  enableOAuth?: boolean;
  oauthProviders?: ('google' | 'github' | 'microsoft')[];
}

/**
 * Create auth module with all services
 */
export function createAuthModule(
  config: AuthModuleConfig
) {
  const {
    jwtSecret,
    jwtExpiresIn = 900, // 15 minutes
    refreshTokenExpiresIn = 604800, // 7 days
    passwordHashAlgorithm = 'bcrypt',
    passwordMinLength = 8,
    passwordRequireNumbers = true,
    passwordRequireSpecialChars = true,
    mfaRequired = false,
    mfaMethods = ['totp'],
    sessionMaxAge = 3600, // 1 hour
    sessionAbsoluteTimeout = 604800, // 7 days
    loginAttemptMaxFails = 5,
    loginAttemptLockoutDuration = 900, // 15 minutes
    enableOAuth = false,
    oauthProviders = [],
  } = config;

  const authConfig: AuthConfiguration = {
    jwtSecret,
    jwtExpiresIn,
    refreshTokenExpiresIn,
    passwordHashAlgorithm: passwordHashAlgorithm as 'bcrypt' | 'argon2',
    passwordMinLength,
    passwordRequireNumbers,
    passwordRequireSpecialChars,
    mfaRequired,
    mfaMethods: mfaMethods as ('email' | 'totp' | 'sms')[],
    sessionMaxAge,
    sessionAbsoluteTimeout,
    loginAttemptMaxFails,
    loginAttemptLockoutDuration,
    enableOAuth,
    oauthProviders: oauthProviders as ('google' | 'github' | 'microsoft')[],
  };

  // Import at runtime to avoid circular dependencies
  const { DatabaseManager } = require('../database');
  const { AuthConfiguration } = require('./types');

  return {
    config: authConfig,
    createServices: (db: DatabaseManager) => {
      const jwtManager = createJWTManager(authConfig);
      const refreshTokenManager = createRefreshTokenManager(authConfig, db);
      const oauth2Manager = createOAuth2Manager(db);
      const userService = createUserService(
        db,
        authConfig,
        jwtManager,
        refreshTokenManager
      );
      const authorizationService = createAuthorizationService(db);
      const authenticationService = createAuthenticationService(
        db,
        authConfig,
        jwtManager,
        refreshTokenManager,
        userService,
        authorizationService,
        oauth2Manager
      );

      return {
        jwtManager,
        refreshTokenManager,
        oauth2Manager,
        userService,
        authorizationService,
        authenticationService,
      };
    },
  };
}

// Re-export commonly used types
export type {
  User,
  UserProfile,
  UserRole,
  Permission,
  AuthConfiguration,
  TokenPair,
  Session,
  AuthorizationContext,
  JWTPayload,
  MFAConfig,
  RegistrationRequest,
  RegistrationResponse,
  AuthenticationRequest,
  AuthenticationResponse,
} from './types';

// Re-export service types
export type {
  JWTManager,
  RefreshTokenManager,
  OAuth2Manager,
  UserService,
  AuthorizationService,
  AuthenticationService,
};
