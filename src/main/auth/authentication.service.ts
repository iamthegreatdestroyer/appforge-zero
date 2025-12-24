/**
 * Authentication Service
 *
 * Handles:
 * - Login and logout
 * - Session management
 * - Multi-factor authentication
 * - Login attempt tracking (rate limiting)
 */

import { DatabaseManager } from '../database';
import { JWTManager, RefreshTokenManager, OAuth2Manager } from './jwt-oauth';
import { UserService } from './user.service';
import { AuthorizationService } from './authorization.service';
import {
  User,
  AuthenticationRequest,
  AuthenticationResponse,
  Session,
  MFAMethod,
  MFAConfig,
  MFAVerificationRequest,
  MFAVerificationResponse,
  LoginAttempt,
  TokenPair,
  AuthConfiguration,
} from './types';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';

/**
 * Authentication service
 */
export class AuthenticationService {
  private db: DatabaseManager;
  private config: AuthConfiguration;
  private jwtManager: JWTManager;
  private refreshTokenManager: RefreshTokenManager;
  private userService: UserService;
  private authorizationService: AuthorizationService;
  private oauth2Manager: OAuth2Manager;

  constructor(
    db: DatabaseManager,
    config: AuthConfiguration,
    jwtManager: JWTManager,
    refreshTokenManager: RefreshTokenManager,
    userService: UserService,
    authorizationService: AuthorizationService,
    oauth2Manager: OAuth2Manager
  ) {
    this.db = db;
    this.config = config;
    this.jwtManager = jwtManager;
    this.refreshTokenManager = refreshTokenManager;
    this.userService = userService;
    this.authorizationService = authorizationService;
    this.oauth2Manager = oauth2Manager;
  }

  /**
   * Authenticate user with email/username and password
   */
  async authenticate(
    request: AuthenticationRequest
  ): Promise<AuthenticationResponse> {
    // Get user
    let user: User | null = null;

    if (request.email) {
      user = await this.userService.getUserByEmail(request.email);
    } else if (request.username) {
      user = await this.userService.getUserByUsername(request.username);
    }

    if (!user) {
      await this.recordLoginAttempt(
        request.email || request.username,
        request.email ? 'email' : 'username',
        false,
        request.email || request.username
      );

      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is disabled',
      };
    }

    // Check if locked out
    const lockedOut = await this.isLockedOut(user.email);
    if (lockedOut) {
      return {
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts',
      };
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const passwordValid = await bcrypt.compare(request.password, user.passwordHash);

    if (!passwordValid) {
      await this.recordLoginAttempt(user.email, 'email', false, user.email);

      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // Check if MFA is required
    if (this.config.mfaRequired || (await this.isMFAEnabled(user.id))) {
      return {
        success: false,
        mfaRequired: true,
        sessionId: await this.createMFASession(user.id),
        error: 'MFA verification required',
      };
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    // Create session
    const sessionId = await this.createSession(
      user.id,
      tokens,
      request.rememberMe
    );

    // Record successful login
    await this.recordLoginAttempt(user.email, 'email', true, user.email);
    await this.updateLastLogin(user.id);

    // Audit log
    await this.authorizationService.auditLog({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      ipAddress: 'unknown',
      status: 'success',
    });

    return {
      success: true,
      user,
      tokens,
      sessionId,
    };
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(
    sessionId: string,
    mfaCode: string
  ): Promise<MFAVerificationResponse> {
    const results = await this.db.query(
      `SELECT user_id FROM mfa_sessions WHERE id = ? AND expires_at > ?`,
      [sessionId, new Date()]
    );

    if (results.length === 0) {
      return {
        verified: false,
        error: 'Invalid or expired MFA session',
      };
    }

    const userId = results[0].user_id;
    const user = await this.userService.getUserById(userId);
    if (!user) {
      return {
        verified: false,
        error: 'User not found',
      };
    }

    // Get MFA config
    const mfaConfigs = await this.getMFAConfigs(userId);
    if (mfaConfigs.length === 0) {
      return {
        verified: false,
        error: 'MFA not configured',
      };
    }

    // Verify with each enabled MFA method
    for (const config of mfaConfigs) {
      if (config.method === 'totp' && config.secret) {
        const verified = speakeasy.totp.verify({
          secret: config.secret,
          encoding: 'base32',
          token: mfaCode,
          window: 2,
        });

        if (verified) {
          // Generate new tokens
          const tokens = await this.generateTokenPair(user);
          const sessionId = await this.createSession(user.id, tokens);

          // Clean up MFA session
          await this.db.execute(
            `DELETE FROM mfa_sessions WHERE id = ?`,
            [sessionId]
          );

          // Audit log
          await this.authorizationService.auditLog({
            userId,
            action: 'mfa_verify',
            resource: 'auth',
            ipAddress: 'unknown',
            status: 'success',
          });

          return {
            verified: true,
            sessionToken: tokens.accessToken,
          };
        }
      }
    }

    return {
      verified: false,
      error: 'Invalid MFA code',
    };
  }

  /**
   * Enable MFA (TOTP)
   */
  async enableMFA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `AppForge Zero (${user.email})`,
      length: 32,
    });

    if (!secret.base32) {
      throw new Error('Failed to generate TOTP secret');
    }

    // Store pending MFA config (not yet verified)
    await this.db.execute(
      `INSERT INTO mfa_configs (user_id, method, secret, enabled, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, 'totp', secret.base32, false, new Date()]
    );

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url || '',
    };
  }

  /**
   * Confirm MFA enrollment
   */
  async confirmMFAEnrollment(
    userId: string,
    method: MFAMethod,
    code: string
  ): Promise<boolean> {
    if (method === 'totp') {
      // Get pending TOTP config
      const results = await this.db.query(
        `SELECT secret FROM mfa_configs WHERE user_id = ? AND method = ? AND enabled = 0 ORDER BY created_at DESC LIMIT 1`,
        [userId, method]
      );

      if (results.length === 0) {
        return false;
      }

      const secret = results[0].secret;

      // Verify code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!verified) {
        return false;
      }

      // Enable MFA
      await this.db.execute(
        `UPDATE mfa_configs SET enabled = 1, verified_at = ? WHERE user_id = ? AND method = ? AND secret = ?`,
        [new Date(), userId, method, secret]
      );

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      await this.db.execute(
        `UPDATE mfa_configs SET backup_codes = ? WHERE user_id = ? AND method = ?`,
        [backupCodes.join(','), userId, method]
      );

      // Audit log
      await this.authorizationService.auditLog({
        userId,
        action: 'mfa_enable',
        resource: 'auth',
        ipAddress: 'unknown',
        status: 'success',
      });

      return true;
    }

    return false;
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string, method: MFAMethod): Promise<boolean> {
    await this.db.execute(
      `DELETE FROM mfa_configs WHERE user_id = ? AND method = ?`,
      [userId, method]
    );

    // Audit log
    await this.authorizationService.auditLog({
      userId,
      action: 'mfa_disable',
      resource: 'auth',
      ipAddress: 'unknown',
      status: 'success',
    });

    return true;
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<void> {
    // Get session info
    const results = await this.db.query(
      `SELECT user_id, refresh_token FROM sessions WHERE id = ?`,
      [sessionId]
    );

    if (results.length > 0) {
      const userId = results[0].user_id;
      const refreshToken = results[0].refresh_token;

      // Revoke refresh token
      if (refreshToken) {
        await this.refreshTokenManager.revokeRefreshToken(refreshToken);
      }

      // Delete session
      await this.db.execute(`DELETE FROM sessions WHERE id = ?`, [sessionId]);

      // Audit log
      await this.authorizationService.auditLog({
        userId,
        action: 'logout',
        resource: 'auth',
        ipAddress: 'unknown',
        status: 'success',
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    // Revoke all refresh tokens
    await this.refreshTokenManager.revokeAllUserTokens(userId);

    // Delete all sessions
    await this.db.execute(`DELETE FROM sessions WHERE user_id = ?`, [userId]);

    // Audit log
    await this.authorizationService.auditLog({
      userId,
      action: 'logout_all',
      resource: 'auth',
      ipAddress: 'unknown',
      status: 'success',
    });
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const results = await this.db.query(
      `SELECT * FROM sessions WHERE id = ? AND is_active = 1`,
      [sessionId]
    );

    if (results.length === 0) {
      return null;
    }

    return this.rowToSession(results[0]);
  }

  /**
   * List user sessions
   */
  async listUserSessions(userId: string): Promise<Session[]> {
    const results = await this.db.query(
      `SELECT * FROM sessions WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC`,
      [userId]
    );

    return results.map((row) => this.rowToSession(row));
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.db.execute(
      `UPDATE sessions SET is_active = 0 WHERE id = ?`,
      [sessionId]
    );
  }

  /**
   * Generate token pair
   */
  private async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = this.jwtManager.generateAccessToken(user);

    const refreshToken = await this.refreshTokenManager.generateRefreshToken(
      user.id
    );

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: this.config.jwtExpiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Create session
   */
  private async createSession(
    userId: string,
    tokens: TokenPair,
    rememberMe: boolean = false
  ): Promise<string> {
    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(
      Date.now() +
        (rememberMe
          ? this.config.sessionAbsoluteTimeout * 1000
          : this.config.sessionMaxAge * 1000)
    );

    await this.db.execute(
      `INSERT INTO sessions (id, user_id, access_token, refresh_token, expires_at, created_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        userId,
        tokens.accessToken,
        tokens.refreshToken,
        expiresAt,
        new Date(),
        true,
      ]
    );

    return sessionId;
  }

  /**
   * Create MFA session
   */
  private async createMFASession(userId: string): Promise<string> {
    const sessionId = `mfa_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.db.execute(
      `INSERT INTO mfa_sessions (id, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
      [sessionId, userId, expiresAt, new Date()]
    );

    return sessionId;
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(
    identifier: string,
    identifierType: 'email' | 'username',
    success: boolean,
    ipAddress: string
  ): Promise<void> {
    const attempt: LoginAttempt = {
      id: `login_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      email: identifierType === 'email' ? identifier : undefined,
      username: identifierType === 'username' ? identifier : undefined,
      ipAddress,
      success,
      timestamp: new Date(),
    };

    await this.db.execute(
      `INSERT INTO login_attempts (id, email, username, ip_address, success, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        attempt.id,
        attempt.email,
        attempt.username,
        attempt.ipAddress,
        success ? 1 : 0,
        attempt.timestamp,
      ]
    );
  }

  /**
   * Check if user is locked out
   */
  private async isLockedOut(email: string): Promise<boolean> {
    const results = await this.db.query(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE email = ? AND success = 0 AND timestamp > ?`,
      [email, new Date(Date.now() - this.config.loginAttemptLockoutDuration * 1000)]
    );

    return results[0].count >= this.config.loginAttemptMaxFails;
  }

  /**
   * Update last login
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET last_login_at = ? WHERE id = ?`,
      [new Date(), userId]
    );
  }

  /**
   * Check if MFA is enabled
   */
  private async isMFAEnabled(userId: string): Promise<boolean> {
    const results = await this.db.query(
      `SELECT COUNT(*) as count FROM mfa_configs WHERE user_id = ? AND enabled = 1`,
      [userId]
    );

    return results[0].count > 0;
  }

  /**
   * Get MFA configs
   */
  private async getMFAConfigs(userId: string): Promise<MFAConfig[]> {
    const results = await this.db.query(
      `SELECT * FROM mfa_configs WHERE user_id = ? AND enabled = 1`,
      [userId]
    );

    return results.map((row) => ({
      userId: row.user_id,
      method: row.method,
      enabled: row.enabled === 1,
      secret: row.secret,
      backupCodes: row.backup_codes?.split(','),
      createdAt: new Date(row.created_at),
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
    }));
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Convert DB row to Session
   */
  private rowToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      deviceId: row.device_id,
      isActive: row.is_active === 1,
    };
  }
}

/**
 * Create authentication service
 */
export function createAuthenticationService(
  db: DatabaseManager,
  config: AuthConfiguration,
  jwtManager: JWTManager,
  refreshTokenManager: RefreshTokenManager,
  userService: UserService,
  authorizationService: AuthorizationService,
  oauth2Manager: OAuth2Manager
): AuthenticationService {
  return new AuthenticationService(
    db,
    config,
    jwtManager,
    refreshTokenManager,
    userService,
    authorizationService,
    oauth2Manager
  );
}
