/**
 * User Service
 *
 * Handles:
 * - User registration
 * - Profile management
 * - Password management
 * - Account settings
 * - Email verification
 */

import { DatabaseManager } from '../database';
import { JWTManager, RefreshTokenManager } from './jwt-oauth';
import {
  User,
  UserProfile,
  RegistrationRequest,
  RegistrationResponse,
  UpdateUserRequest,
  PasswordResetToken,
  EmailVerificationToken,
  AuthConfiguration,
  PasswordStrengthResult,
  TokenPair,
  CreateUserRequest,
} from './types';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * User service
 */
export class UserService {
  private db: DatabaseManager;
  private config: AuthConfiguration;
  private jwtManager: JWTManager;
  private refreshTokenManager: RefreshTokenManager;

  constructor(
    db: DatabaseManager,
    config: AuthConfiguration,
    jwtManager: JWTManager,
    refreshTokenManager: RefreshTokenManager
  ) {
    this.db = db;
    this.config = config;
    this.jwtManager = jwtManager;
    this.refreshTokenManager = refreshTokenManager;
  }

  /**
   * Register new user
   */
  async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    // Validate input
    if (!request.email || !request.username || !request.password) {
      return {
        success: false,
        emailVerificationRequired: false,
        error: 'Missing required fields',
      };
    }

    // Check if user exists
    const existing = await this.getUserByEmail(request.email);
    if (existing) {
      return {
        success: false,
        emailVerificationRequired: false,
        error: 'Email already registered',
      };
    }

    const existingUsername = await this.getUserByUsername(request.username);
    if (existingUsername) {
      return {
        success: false,
        emailVerificationRequired: false,
        error: 'Username already taken',
      };
    }

    // Validate password strength
    const passwordStrength = this.validatePasswordStrength(request.password);
    if (!passwordStrength.isValid) {
      return {
        success: false,
        emailVerificationRequired: false,
        error: `Password is too weak: ${passwordStrength.feedback.join(', ')}`,
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(request.password, 12);

    // Create user
    const userId = `user_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();

    try {
      await this.db.execute(
        `INSERT INTO users (id, email, username, display_name, password_hash, role, is_email_verified, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          request.email.toLowerCase(),
          request.username.toLowerCase(),
          request.displayName || request.username,
          passwordHash,
          'user',
          false, // Email not verified
          true, // Active
          now,
          now,
        ]
      );

      // Get created user
      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          emailVerificationRequired: false,
          error: 'Failed to create user',
        };
      }

      // Create email verification token
      await this.createEmailVerificationToken(userId);

      return {
        success: true,
        user,
        emailVerificationRequired: true,
      };
    } catch (error) {
      return {
        success: false,
        emailVerificationRequired: false,
        error: 'Failed to create user',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const results = await this.db.query(
      `SELECT * FROM users WHERE id = ?`,
      [id]
    );

    if (results.length === 0) {
      return null;
    }

    return this.rowToUser(results[0]);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const results = await this.db.query(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (results.length === 0) {
      return null;
    }

    return this.rowToUser(results[0]);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const results = await this.db.query(
      `SELECT * FROM users WHERE username = ?`,
      [username.toLowerCase()]
    );

    if (results.length === 0) {
      return null;
    }

    return this.rowToUser(results[0]);
  }

  /**
   * Get user profile (public)
   */
  async getUserProfile(id: string): Promise<UserProfile | null> {
    const user = await this.getUserById(id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      isCreator: user.role === 'creator',
    };
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.displayName !== undefined) {
      updateFields.push('display_name = ?');
      updateValues.push(updates.displayName);
    }

    if (updates.profileImageUrl !== undefined) {
      updateFields.push('profile_image_url = ?');
      updateValues.push(updates.profileImageUrl);
    }

    if (updates.isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return user;
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date());
    updateValues.push(userId);

    await this.db.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return this.getUserById(userId);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      return false;
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      return false;
    }

    // Validate new password strength
    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return false;
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    await this.db.execute(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [newHash, new Date(), userId]
    );

    // Revoke all refresh tokens (user must re-login on all devices)
    await this.refreshTokenManager.revokeAllUserTokens(userId);

    return true;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return null;
    }

    return this.createPasswordResetToken(user.id);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const results = await this.db.query(
      `SELECT user_id FROM password_reset_tokens 
       WHERE token = ? AND expires_at > ? AND used_at IS NULL`,
      [token, new Date()]
    );

    if (results.length === 0) {
      return false;
    }

    const userId = results[0].user_id;

    // Validate password strength
    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return false;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.db.execute(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [passwordHash, new Date(), userId]
    );

    // Mark token as used
    await this.db.execute(
      `UPDATE password_reset_tokens SET used_at = ? WHERE token = ?`,
      [new Date(), token]
    );

    // Revoke all sessions
    await this.refreshTokenManager.revokeAllUserTokens(userId);

    return true;
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<boolean> {
    const results = await this.db.query(
      `SELECT user_id FROM email_verification_tokens 
       WHERE token = ? AND expires_at > ? AND used_at IS NULL`,
      [token, new Date()]
    );

    if (results.length === 0) {
      return false;
    }

    const userId = results[0].user_id;

    await this.db.execute(
      `UPDATE users SET is_email_verified = ?, updated_at = ? WHERE id = ?`,
      [true, new Date(), userId]
    );

    // Mark token as used
    await this.db.execute(
      `UPDATE email_verification_tokens SET used_at = ? WHERE token = ?`,
      [new Date(), token]
    );

    return true;
  }

  /**
   * Search users (admin only)
   */
  async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: User[]; total: number }> {
    const searchTerm = `%${query.toLowerCase()}%`;

    const users = await this.db.query(
      `SELECT * FROM users 
       WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR LOWER(display_name) LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, limit, offset]
    );

    const countResult = await this.db.query(
      `SELECT COUNT(*) as total FROM users 
       WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR LOWER(display_name) LIKE ?`,
      [searchTerm, searchTerm, searchTerm]
    );

    return {
      users: users.map((row) => this.rowToUser(row)),
      total: countResult[0]?.total || 0,
    };
  }

  /**
   * Create admin user (bootstrap)
   */
  async createAdminUser(request: CreateUserRequest): Promise<User | null> {
    const userId = `user_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();

    let passwordHash: string;
    if (request.password) {
      passwordHash = await bcrypt.hash(request.password, 12);
    } else {
      // Generate temporary password
      const tempPassword = crypto.randomBytes(16).toString('hex');
      passwordHash = await bcrypt.hash(tempPassword, 12);
    }

    await this.db.execute(
      `INSERT INTO users (id, email, username, display_name, password_hash, role, is_email_verified, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        request.email.toLowerCase(),
        request.username.toLowerCase(),
        request.displayName || request.username,
        passwordHash,
        request.role,
        true, // Admin email is verified
        true,
        now,
        now,
      ]
    );

    return this.getUserById(userId);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Password should be at least 8 characters');

    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Password should contain uppercase letters');

    if (this.config.passwordRequireNumbers && !/[0-9]/.test(password)) {
      feedback.push('Password should contain numbers');
    } else if (/[0-9]/.test(password)) {
      score++;
    }

    if (
      this.config.passwordRequireSpecialChars &&
      !/[!@#$%^&*]/.test(password)
    ) {
      feedback.push('Password should contain special characters');
    } else if (/[!@#$%^&*]/.test(password)) {
      score++;
    }

    // Check for common patterns
    if (
      /(.)\1{2,}/.test(password) ||
      /^(123|abc|password)/i.test(password)
    ) {
      feedback.push('Password contains common patterns');
      score = Math.max(0, score - 1);
    }

    const strengths = ['weak', 'fair', 'good', 'strong', 'very strong'] as const;

    return {
      score: Math.min(score, 4),
      strength: strengths[Math.min(score, 4)],
      feedback,
      isValid:
        password.length >= this.config.passwordMinLength &&
        feedback.length === 0,
    };
  }

  /**
   * Create email verification token
   */
  private async createEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.db.execute(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, token, expiresAt, new Date()]
    );

    return token;
  }

  /**
   * Create password reset token
   */
  private async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.db.execute(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, token, expiresAt, new Date()]
    );

    return token;
  }

  /**
   * Convert DB row to User
   */
  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      role: row.role,
      permissions: (row.permissions || '').split(',').filter(Boolean),
      profileImageUrl: row.profile_image_url,
      isEmailVerified: row.is_email_verified,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
    };
  }
}

/**
 * Create user service
 */
export function createUserService(
  db: DatabaseManager,
  config: AuthConfiguration,
  jwtManager: JWTManager,
  refreshTokenManager: RefreshTokenManager
): UserService {
  return new UserService(db, config, jwtManager, refreshTokenManager);
}
