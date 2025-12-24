/**
 * Phase 7: Authentication & Authorization Types
 *
 * Comprehensive type definitions for:
 * - JWT authentication
 * - OAuth2 flows
 * - User management
 * - Role-based access control
 * - Multi-factor authentication
 */

/**
 * User roles
 */
export type UserRole =
  | 'admin'
  | 'moderator'
  | 'creator'
  | 'user'
  | 'guest';

/**
 * Permission types
 */
export type Permission =
  | 'template.create'
  | 'template.read'
  | 'template.update'
  | 'template.delete'
  | 'payment.process'
  | 'payment.refund'
  | 'trend.analyze'
  | 'build.create'
  | 'build.deploy'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  | 'analytics.view'
  | 'admin.access';

/**
 * User account
 */
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  profileImageUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * User profile (public-facing)
 */
export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  createdAt: Date;
  bio?: string;
  website?: string;
  isCreator: boolean;
  rating?: number;
}

/**
 * JWT payload
 */
export interface JWTPayload {
  sub: string; // subject (user ID)
  email: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  iat: number; // issued at
  exp: number; // expiration
  aud: string; // audience
  iss: string; // issuer
  jti?: string; // JWT ID (for revocation)
}

/**
 * JWT token pair
 */
export interface TokenPair {
  accessToken: string; // Short-lived (15 min)
  refreshToken: string; // Long-lived (7 days)
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

/**
 * Refresh token data
 */
export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  rotationCount: number;
  deviceId?: string;
  ipAddress?: string;
}

/**
 * OAuth2 provider
 */
export type OAuthProvider = 'google' | 'github' | 'microsoft';

/**
 * OAuth2 configuration
 */
export interface OAuthConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

/**
 * OAuth2 authorization code flow
 */
export interface OAuthFlow {
  state: string; // CSRF protection
  codeChallenge?: string; // PKCE
  codeChallengeMethod?: 'S256' | 'plain';
  expiresAt: Date;
}

/**
 * OAuth2 token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
}

/**
 * OAuth2 user info
 */
export interface OAuthUserInfo {
  sub: string; // Subject identifier
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  provider: OAuthProvider;
}

/**
 * Session data
 */
export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  isActive: boolean;
}

/**
 * MFA method
 */
export type MFAMethod = 'email' | 'totp' | 'sms';

/**
 * MFA configuration
 */
export interface MFAConfig {
  userId: string;
  method: MFAMethod;
  enabled: boolean;
  secret?: string; // For TOTP
  backupCodes?: string[];
  createdAt: Date;
  verifiedAt?: Date;
}

/**
 * MFA verification request
 */
export interface MFAVerificationRequest {
  userId: string;
  method: MFAMethod;
  code: string;
  rememberDevice?: boolean;
}

/**
 * MFA verification response
 */
export interface MFAVerificationResponse {
  verified: boolean;
  sessionToken?: string;
  error?: string;
}

/**
 * Email verification token
 */
export interface EmailVerificationToken {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
}

/**
 * Password reset token
 */
export interface PasswordResetToken {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
}

/**
 * Authentication request
 */
export interface AuthenticationRequest {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

/**
 * Authentication response
 */
export interface AuthenticationResponse {
  success: boolean;
  user?: User;
  tokens?: TokenPair;
  mfaRequired?: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Registration request
 */
export interface RegistrationRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  acceptTerms: boolean;
}

/**
 * Registration response
 */
export interface RegistrationResponse {
  success: boolean;
  user?: User;
  emailVerificationRequired: boolean;
  error?: string;
}

/**
 * Authorization context (attached to requests)
 */
export interface AuthorizationContext {
  userId: string;
  user: User;
  sessionId: string;
  isAuthenticated: boolean;
  role: UserRole;
  permissions: Set<Permission>;
}

/**
 * Authorization check result
 */
export interface AuthorizationCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
}

/**
 * Role definition
 */
export interface RoleDefinition {
  role: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  isBuiltin: boolean;
  canBeModified: boolean;
}

/**
 * RBAC policy
 */
export interface RBACPolicy {
  id: string;
  role: UserRole;
  resource: string;
  action: string;
  allowed: boolean;
  conditions?: Record<string, any>;
  createdAt: Date;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failure';
  error?: string;
  timestamp: Date;
}

/**
 * Login attempt (for rate limiting)
 */
export interface LoginAttempt {
  id: string;
  email?: string;
  username?: string;
  ipAddress: string;
  success: boolean;
  timestamp: Date;
  userAgent?: string;
}

/**
 * Auth configuration
 */
export interface AuthConfiguration {
  jwtSecret: string;
  jwtExpiresIn: number; // seconds (default: 900 = 15 min)
  refreshTokenExpiresIn: number; // seconds (default: 604800 = 7 days)
  passwordHashAlgorithm: 'bcrypt' | 'argon2';
  passwordMinLength: number;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  mfaRequired: boolean;
  mfaMethods: MFAMethod[];
  sessionMaxAge: number; // seconds
  sessionAbsoluteTimeout: number; // seconds
  loginAttemptMaxFails: number;
  loginAttemptLockoutDuration: number; // seconds
  enableOAuth: boolean;
  oauthProviders: OAuthProvider[];
}

/**
 * Password strength result
 */
export interface PasswordStrengthResult {
  score: number; // 0-4
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very strong';
  feedback: string[];
  isValid: boolean;
}

/**
 * API key (for service-to-service auth)
 */
export interface APIKey {
  id: string;
  userId?: string;
  key: string; // Hashed
  name: string;
  permissions: Permission[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Two-step verification (different from MFA)
 */
export interface TwoStepVerification {
  step: number; // 1 or 2
  verified: boolean;
  timestamp: Date;
  expiresAt: Date;
}

/**
 * Security event
 */
export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'password_change' | 'mfa_enable' | 'mfa_disable' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  ipAddress: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Create user request (admin)
 */
export interface CreateUserRequest {
  email: string;
  username: string;
  displayName?: string;
  role: UserRole;
  password?: string; // If not provided, user must reset
  sendWelcomeEmail?: boolean;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  displayName?: string;
  profileImageUrl?: string;
  email?: string;
  username?: string;
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
}
