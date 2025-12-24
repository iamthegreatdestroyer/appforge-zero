/**
 * @fileoverview External API integration type definitions
 * @description Shared types for API clients, webhooks, and payment systems
 */

/**
 * HTTP Request configuration
 */
export interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  body?: Record<string, unknown> | string;
  timeout?: number;
}

/**
 * HTTP Response wrapper
 */
export interface HttpResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  rawBody: string;
}

/**
 * API Client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  timeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelayMs?: number;
  rateLimitPerSecond?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

/**
 * Retry policy for failed requests
 */
export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number; // exponential backoff
  maxDelayMs: number;
  retryableStatusCodes: number[]; // 408, 429, 500, 502, 503, 504
}

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  requestsPerSecond: number;
  windowMs?: number; // milliseconds
  maxBurstSize?: number;
}

/**
 * Payment provider types
 */
export type PaymentProvider = 'stripe' | 'gumroad' | 'ko-fi' | 'itch';

/**
 * Payment transaction status
 */
export type TransactionStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'disputed';

/**
 * Payment transaction
 */
export interface PaymentTransaction {
  id: string;
  provider: PaymentProvider;
  externalId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  customerEmail: string;
  productId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'trend.updated'
  | 'apk.built'
  | 'apk.failed';

/**
 * Webhook payload
 */
export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: Date;
  provider: string;
  data: Record<string, unknown>;
  signature?: string; // for verification
}

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  processedId?: string;
  error?: string;
}

/**
 * Trend data sources
 */
export type TrendSource = 'twitter' | 'tiktok' | 'reddit' | 'google-trends';

/**
 * Trend data structure
 */
export interface TrendData {
  id: string;
  source: TrendSource;
  title: string;
  searchVolume?: number;
  growthRate?: number;
  metadata?: Record<string, unknown>;
  fetchedAt: Date;
  expiresAt: Date;
}

/**
 * APK build configuration
 */
export interface ApkBuildConfig {
  appName: string;
  appId: string;
  version: string;
  minSdk: number;
  targetSdk: number;
  appIconPath: string;
  assetsPath: string;
  features: string[];
  permissions: string[];
  signingKey?: {
    keyStorePath: string;
    keyStorePassword: string;
    keyAlias: string;
    keyPassword: string;
  };
}

/**
 * APK build result
 */
export interface ApkBuildResult {
  success: boolean;
  appPath?: string;
  size?: number;
  signature?: string;
  buildTime?: number; // milliseconds
  error?: string;
  logs?: string[];
}

/**
 * API error details
 */
export interface ApiErrorDetails {
  statusCode: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  retryAfterMs?: number;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Cloud storage provider
 */
export type CloudStorageProvider = 'google-drive' | 'dropbox';

/**
 * Cloud storage file metadata
 */
export interface CloudStorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  provider: CloudStorageProvider;
  url?: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Cloud storage sync status
 */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

/**
 * Cloud storage sync result
 */
export interface CloudStorageSyncResult {
  status: SyncStatus;
  filesUploaded: number;
  filesDownloaded: number;
  bytesSynced: number;
  error?: string;
  completedAt?: Date;
}

/**
 * API configuration storage (environment variables)
 */
export interface ApiConfiguration {
  // Stripe
  stripe?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };

  // Gumroad
  gumroad?: {
    accessToken: string;
    webhookSecret: string;
  };

  // Ko-fi
  koFi?: {
    verificationToken: string;
    webhookSecret: string;
  };

  // Itch.io
  itch?: {
    apiKey: string;
    webhookSecret: string;
  };

  // Twitter/X
  twitter?: {
    apiKey: string;
    apiSecret: string;
    bearerToken: string;
    webhookSecret: string;
  };

  // TikTok
  tiktok?: {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    webhookSecret: string;
  };

  // Reddit
  reddit?: {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
  };

  // Google Trends
  googleTrends?: {
    apiKey: string;
  };

  // Google Drive
  googleDrive?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };

  // Dropbox
  dropbox?: {
    accessToken: string;
    refreshToken: string;
  };
}
