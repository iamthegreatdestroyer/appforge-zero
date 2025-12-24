/**
 * JWT & OAuth2 Implementation
 *
 * Provides:
 * - JWT token generation and validation
 * - OAuth2 authorization code flow
 * - Token refresh and revocation
 * - PKCE support for mobile/SPA
 */

import { DatabaseManager } from '../database';
import {
  JWTPayload,
  TokenPair,
  RefreshToken,
  OAuthConfig,
  OAuthFlow,
  OAuthTokenResponse,
  OAuthUserInfo,
  User,
  AuthConfiguration,
} from './types';
import * as crypto from 'crypto';

/**
 * JWT manager
 */
export class JWTManager {
  private config: AuthConfiguration;

  constructor(config: AuthConfiguration) {
    this.config = config;
  }

  /**
   * Generate JWT token
   */
  generateAccessToken(user: User): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.jwtExpiresIn;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      iat: now,
      exp: expiresAt,
      aud: 'appforge-zero',
      iss: 'appforge-zero',
      jti: this.generateJTI(),
    };

    return this.sign(payload);
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const payload = this.verify(token) as JWTPayload;

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return null;
      }

      // Verify audience and issuer
      if (payload.aud !== 'appforge-zero' || payload.iss !== 'appforge-zero') {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      ) as JWTPayload;

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sign payload
   */
  private sign(payload: JWTPayload): string {
    const header = this.encodeBase64(JSON.stringify({
      alg: 'HS256',
      typ: 'JWT',
    }));

    const body = this.encodeBase64(JSON.stringify(payload));

    const signature = crypto
      .createHmac('sha256', this.config.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify signature
   */
  private verify(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [header, body, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', this.config.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    return JSON.parse(Buffer.from(body, 'base64').toString());
  }

  /**
   * Encode to base64url
   */
  private encodeBase64(data: string): string {
    return Buffer.from(data)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate JWT ID
   */
  private generateJTI(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Refresh token manager
 */
export class RefreshTokenManager {
  private config: AuthConfiguration;
  private db: DatabaseManager;

  constructor(config: AuthConfiguration, db: DatabaseManager) {
    this.config = config;
    this.db = db;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(
    userId: string,
    deviceId?: string,
    ipAddress?: string
  ): Promise<RefreshToken> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.refreshTokenExpiresIn * 1000);

    const refreshToken: RefreshToken = {
      id: `rft_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      rotationCount: 0,
      deviceId,
      ipAddress,
    };

    // Store in database
    await this.db.execute(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, device_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        refreshToken.id,
        userId,
        this.hashToken(token),
        expiresAt,
        refreshToken.createdAt,
        deviceId,
        ipAddress,
      ]
    );

    return refreshToken;
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string, userId: string): Promise<boolean> {
    const results = await this.db.query(
      `SELECT revoked_at FROM refresh_tokens 
       WHERE user_id = ? AND token = ? AND expires_at > ? AND revoked_at IS NULL`,
      [userId, this.hashToken(token), new Date()]
    );

    return results.length > 0;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.db.execute(
      `UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?`,
      [new Date(), this.hashToken(token)]
    );
  }

  /**
   * Revoke all user tokens
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
      [new Date(), userId]
    );
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db.execute(
      `DELETE FROM refresh_tokens WHERE expires_at < ?`,
      [new Date()]
    );

    return result;
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

/**
 * OAuth2 manager
 */
export class OAuth2Manager {
  private configs: Map<string, OAuthConfig>;
  private flows: Map<string, OAuthFlow>;
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.configs = new Map();
    this.flows = new Map();
    this.db = db;
  }

  /**
   * Register OAuth provider
   */
  registerProvider(provider: string, config: OAuthConfig): void {
    this.configs.set(provider, config);
  }

  /**
   * Start authorization flow (return URL for user to visit)
   */
  startAuthorizationFlow(
    provider: string,
    usePKCE: boolean = true
  ): { authorizationUrl: string; state: string; codeChallenge?: string } {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    const state = crypto.randomBytes(16).toString('hex');
    let codeChallenge: string | undefined;
    let codeChallengeMethod: 'S256' | 'plain' | undefined;

    // PKCE support (recommended for SPAs and mobile)
    if (usePKCE) {
      const codeVerifier = crypto.randomBytes(32).toString('hex');
      codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      codeChallengeMethod = 'S256';

      // Store code verifier for later (in session/cache)
      // In production, store in Redis or secure session
    }

    const flow: OAuthFlow = {
      state,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };

    this.flows.set(state, flow);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state,
      ...(codeChallenge && {
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod!,
      }),
    });

    return {
      authorizationUrl: `${config.authorizationUrl}?${params.toString()}`,
      state,
      codeChallenge,
    };
  }

  /**
   * Handle authorization callback
   */
  async handleAuthorizationCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    // Verify state
    const flow = this.flows.get(state);
    if (!flow) {
      throw new Error('Invalid state parameter');
    }

    if (flow.expiresAt < new Date()) {
      this.flows.delete(state);
      throw new Error('State expired');
    }

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(
      provider,
      code,
      config
    );

    this.flows.delete(state);

    return tokenResponse;
  }

  /**
   * Get user info from OAuth provider
   */
  async getUserInfo(
    provider: string,
    accessToken: string
  ): Promise<OAuthUserInfo> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    const response = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from OAuth provider');
    }

    const data = await response.json();

    return {
      sub: data.sub || data.id,
      email: data.email,
      email_verified: data.email_verified || false,
      name: data.name || data.login,
      picture: data.picture || data.avatar_url,
      provider: provider as any,
    };
  }

  /**
   * Exchange authorization code for token
   */
  private async exchangeCodeForToken(
    provider: string,
    code: string,
    config: OAuthConfig
  ): Promise<OAuthTokenResponse> {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return (await response.json()) as OAuthTokenResponse;
  }
}

/**
 * Create JWT manager
 */
export function createJWTManager(config: AuthConfiguration): JWTManager {
  return new JWTManager(config);
}

/**
 * Create refresh token manager
 */
export function createRefreshTokenManager(
  config: AuthConfiguration,
  db: DatabaseManager
): RefreshTokenManager {
  return new RefreshTokenManager(config, db);
}

/**
 * Create OAuth2 manager
 */
export function createOAuth2Manager(db: DatabaseManager): OAuth2Manager {
  return new OAuth2Manager(db);
}
