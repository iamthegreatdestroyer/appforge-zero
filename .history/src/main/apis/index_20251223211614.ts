/**
 * APIs Module - Unified External API Integration
 *
 * Exports all API clients, processors, and handlers
 */

// HTTP Client
export { ApiClient, createApiClient } from "./http-client";
export type {
  HttpRequest,
  HttpResponse,
  ApiClientConfig,
  RateLimitInfo,
} from "./types";

// Payment Processing
export {
  PaymentProcessor,
  PaymentManager,
  StripeProcessor,
  GumroadProcessor,
  KoFiProcessor,
  ItchProcessor,
} from "./payment-processors";
export type {
  PaymentTransaction,
  PaymentProvider,
  TransactionStatus,
} from "./types";

// Trend Sources
export {
  TrendSource,
  TrendManager,
  TwitterTrendSource,
  TikTokTrendSource,
  RedditTrendSource,
  GoogleTrendsSource,
} from "./trend-sources";
export type { TrendData } from "./types";

// APK Builder
export { ApkBuilder, GooglePlayUploader } from "./apk-builder";
export type { ApkBuildConfig, ApkBuildResult } from "./types";

// Cloud Storage
export {
  CloudStorageProvider,
  CloudStorageManager,
  GoogleDriveProvider,
  DropboxProvider,
} from "./cloud-storage";
export type { CloudStorageFile, CloudStorageSyncResult } from "./types";

// Webhooks
export {
  SignatureVerifier,
  WebhookProcessor,
  UnifiedWebhookHandler,
  StripeWebhookHandler,
  GumroadWebhookHandler,
  KoFiWebhookHandler,
  ItchWebhookHandler,
} from "./webhooks";
export type {
  WebhookPayload,
  WebhookEventType,
  WebhookHandlerResult,
} from "./types";

// Types
export type {
  ApiConfiguration,
  ApiErrorDetails,
  RateLimitConfig,
  RetryPolicy,
} from "./types";
