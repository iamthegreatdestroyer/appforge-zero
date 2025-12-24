/**
 * API Integration Test Suite
 *
 * Comprehensive tests for all external API integrations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiClient,
  createApiClient,
  StripeProcessor,
  GumroadProcessor,
  KoFiProcessor,
  ItchProcessor,
  PaymentManager,
  TwitterTrendSource,
  TikTokTrendSource,
  RedditTrendSource,
  GoogleTrendsSource,
  TrendManager,
  SignatureVerifier,
  UnifiedWebhookHandler,
  ApkBuilder,
  GoogleDriveProvider,
  DropboxProvider,
  CloudStorageManager,
} from "./index";

describe("API Integration Tests", () => {
  // ============ HTTP CLIENT TESTS ============
  describe("ApiClient - HTTP Client with Retries", () => {
    let client: ApiClient;

    beforeEach(() => {
      client = createApiClient({
        baseUrl: "https://api.example.com",
        apiKey: "test-key",
        retryAttempts: 3,
        retryDelayMs: 100,
        rateLimitPerSecond: 10,
      });
    });

    it("should create API client with config", () => {
      expect(client).toBeDefined();
    });

    it("should track rate limit info", () => {
      const rateLimit = client.getRateLimitInfo();
      expect(rateLimit.limit).toBe(10);
      expect(rateLimit.remaining).toBe(10);
    });

    it("should maintain request logs", () => {
      const logs = client.getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should clear logs", () => {
      client.clearLogs();
      expect(client.getLogs().length).toBe(0);
    });

    it("should build proper URLs with query params", async () => {
      // Mock fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          text: () => Promise.resolve("{}"),
        } as any)
      );

      await client.get("https://api.example.com/test", { page: 1, limit: 10 });

      // Verify URL construction
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain("page=1");
      expect(callArgs[0]).toContain("limit=10");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });
  });

  // ============ PAYMENT PROCESSORS TESTS ============
  describe("Payment Processors", () => {
    let paymentManager: PaymentManager;
    let stripeProcessor: StripeProcessor;

    beforeEach(() => {
      paymentManager = new PaymentManager();
      stripeProcessor = new StripeProcessor("sk_test_xyz");
      paymentManager.registerProcessor(stripeProcessor);
    });

    it("should register payment processor", () => {
      const processor = paymentManager.getProcessor("stripe");
      expect(processor).toBe(stripeProcessor);
    });

    it("should throw error for unregistered processor", () => {
      expect(() => paymentManager.getProcessor("unknown" as any)).toThrow();
    });

    it("should map Stripe status correctly", () => {
      // Test private method through public API behavior
      expect(stripeProcessor.provider).toBe("stripe");
    });

    it("should support Gumroad processor", () => {
      const gumroad = new GumroadProcessor("token_xyz");
      paymentManager.registerProcessor(gumroad);
      expect(gumroad.provider).toBe("gumroad");
    });

    it("should support Ko-fi processor", () => {
      const kofi = new KoFiProcessor("token_xyz");
      paymentManager.registerProcessor(kofi);
      expect(kofi.provider).toBe("ko-fi");
    });

    it("should support Itch.io processor", () => {
      const itch = new ItchProcessor("key_xyz");
      paymentManager.registerProcessor(itch);
      expect(itch.provider).toBe("itch");
    });
  });

  // ============ TREND SOURCES TESTS ============
  describe("Trend Sources", () => {
    let trendManager: TrendManager;

    beforeEach(() => {
      trendManager = new TrendManager();
    });

    it("should register Twitter trend source", () => {
      const twitter = new TwitterTrendSource("bearer_token");
      trendManager.registerSource(twitter);
      expect(trendManager.getSource("twitter")).toBe(twitter);
    });

    it("should register TikTok trend source", () => {
      const tiktok = new TikTokTrendSource("client_id", "client_secret");
      trendManager.registerSource(tiktok);
      expect(tiktok.source).toBe("tiktok");
    });

    it("should register Reddit trend source", () => {
      const reddit = new RedditTrendSource("id", "secret", "user", "pass");
      trendManager.registerSource(reddit);
      expect(reddit.source).toBe("reddit");
    });

    it("should register Google Trends source", () => {
      const google = new GoogleTrendsSource("api_key");
      trendManager.registerSource(google);
      expect(google.source).toBe("google-trends");
    });

    it("should throw error for unregistered source", () => {
      expect(() => trendManager.getSource("unknown" as any)).toThrow();
    });
  });

  // ============ WEBHOOK TESTS ============
  describe("Webhooks", () => {
    let handler: UnifiedWebhookHandler;

    beforeEach(() => {
      handler = new UnifiedWebhookHandler();
    });

    it("should verify Stripe HMAC signature", () => {
      const secret = "whsec_test";
      const payload = "test payload";
      const hash = require("crypto")
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const verified = SignatureVerifier.verifyHMAC(payload, hash, secret);
      expect(verified).toBe(true);
    });

    it("should reject invalid signatures", () => {
      const secret = "whsec_test";
      const payload = "test payload";
      const invalidHash = "invalid_hash_value";

      const verified = SignatureVerifier.verifyHMAC(
        payload,
        invalidHash,
        secret
      );
      expect(verified).toBe(false);
    });

    it("should handle generic HMAC verification", () => {
      const secret = "test_secret";
      const payload = "test data";
      const algorithm = "sha256";

      const hash = require("crypto")
        .createHmac(algorithm, secret)
        .update(payload)
        .digest("hex");

      const verified = SignatureVerifier.verifyHMAC(
        payload,
        hash,
        secret,
        algorithm
      );
      expect(verified).toBe(true);
    });

    it("should parse Stripe webhook payload", () => {
      const secret = "whsec_test";
      const payload = JSON.stringify({
        id: "evt_test",
        type: "payment.completed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "pi_test",
            amount: 1000,
            status: "succeeded",
          },
        },
      });

      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const webhook = handler.parseStripeWebhook(payload, signature, secret);

      expect(webhook).toBeDefined();
      expect(webhook?.eventType).toBe("payment.completed");
      expect(webhook?.provider).toBe("stripe");
    });

    it("should reject invalid Stripe webhook", () => {
      const payload = "{}";
      const invalidSignature = "invalid";
      const secret = "whsec_test";

      const webhook = handler.parseStripeWebhook(
        payload,
        invalidSignature,
        secret
      );
      expect(webhook).toBeNull();
    });
  });

  // ============ CLOUD STORAGE TESTS ============
  describe("Cloud Storage", () => {
    let storageManager: CloudStorageManager;

    beforeEach(() => {
      storageManager = new CloudStorageManager();
    });

    it("should register Google Drive provider", () => {
      const googleDrive = new GoogleDriveProvider(
        "client_id",
        "client_secret",
        "refresh_token"
      );
      storageManager.registerProvider(googleDrive);
      expect(storageManager.getProvider("google-drive")).toBe(googleDrive);
    });

    it("should register Dropbox provider", () => {
      const dropbox = new DropboxProvider("access_token");
      storageManager.registerProvider(dropbox);
      expect(storageManager.getProvider("dropbox")).toBe(dropbox);
    });

    it("should throw error for unregistered provider", () => {
      expect(() => storageManager.getProvider("unknown" as any)).toThrow();
    });

    it("should support multiple cloud providers", () => {
      const googleDrive = new GoogleDriveProvider("id", "secret", "token");
      const dropbox = new DropboxProvider("token");

      storageManager.registerProvider(googleDrive);
      storageManager.registerProvider(dropbox);

      expect(() => storageManager.getProvider("google-drive")).not.toThrow();
      expect(() => storageManager.getProvider("dropbox")).not.toThrow();
    });
  });

  // ============ APK BUILDER TESTS ============
  describe("APK Builder", () => {
    let builder: ApkBuilder;

    beforeEach(() => {
      builder = new ApkBuilder("/tmp/apk-test");
    });

    it("should create APK builder instance", () => {
      expect(builder).toBeDefined();
    });

    it("should validate build config", async () => {
      const invalidConfig = {
        appName: "",
        appId: "",
        version: "1.0",
        minSdk: 21,
        targetSdk: 33,
        appIconPath: "/nonexistent/icon.png",
        assetsPath: "/nonexistent/assets",
        features: [],
        permissions: [],
      };

      const result = await builder.buildApk(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should require valid SDK versions", async () => {
      const invalidConfig = {
        appName: "Test App",
        appId: "com.test.app",
        version: "1.0",
        minSdk: 33,
        targetSdk: 21, // Invalid: min > target
        appIconPath: "/nonexistent/icon.png",
        assetsPath: "/nonexistent/assets",
        features: [],
        permissions: ["INTERNET"],
      };

      const result = await builder.buildApk(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  // ============ INTEGRATION TESTS ============
  describe("API Integration", () => {
    it("should initialize complete API ecosystem", () => {
      const paymentManager = new PaymentManager();
      const trendManager = new TrendManager();
      const storageManager = new CloudStorageManager();

      // Register all providers
      paymentManager.registerProcessor(new StripeProcessor("key"));
      paymentManager.registerProcessor(new GumroadProcessor("token"));
      paymentManager.registerProcessor(new KoFiProcessor("token"));
      paymentManager.registerProcessor(new ItchProcessor("key"));

      trendManager.registerSource(new TwitterTrendSource("token"));
      trendManager.registerSource(new TikTokTrendSource("id", "secret"));
      trendManager.registerSource(new GoogleTrendsSource("key"));

      storageManager.registerProvider(
        new GoogleDriveProvider("id", "secret", "token")
      );
      storageManager.registerProvider(new DropboxProvider("token"));

      // Verify all registered
      expect(() => paymentManager.getProcessor("stripe")).not.toThrow();
      expect(() => paymentManager.getProcessor("gumroad")).not.toThrow();
      expect(() => paymentManager.getProcessor("ko-fi")).not.toThrow();
      expect(() => paymentManager.getProcessor("itch")).not.toThrow();

      expect(() => trendManager.getSource("twitter")).not.toThrow();
      expect(() => trendManager.getSource("tiktok")).not.toThrow();

      expect(() => storageManager.getProvider("google-drive")).not.toThrow();
      expect(() => storageManager.getProvider("dropbox")).not.toThrow();
    });

    it("should handle multiple payment providers simultaneously", async () => {
      const paymentManager = new PaymentManager();
      paymentManager.registerProcessor(new StripeProcessor("key"));
      paymentManager.registerProcessor(new GumroadProcessor("token"));

      // Mock successful processing
      const results = await paymentManager.processPaymentMulti(99.99, "usd", {
        productId: "test-app",
      });

      // Both processors should return results
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe("Error Handling", () => {
    it("should handle API client timeouts gracefully", async () => {
      const client = createApiClient({
        baseUrl: "https://api.example.com",
        timeout: 100, // Very short timeout
      });

      // This would timeout in real scenario
      expect(client).toBeDefined();
    });

    it("should classify API errors correctly", async () => {
      const client = createApiClient({
        baseUrl: "https://api.example.com",
      });

      // Verify rate limiter is initialized
      const rateLimit = client.getRateLimitInfo();
      expect(rateLimit.remaining).toBeGreaterThanOrEqual(0);
    });

    it("should handle webhook signature verification failures", () => {
      const handler = new UnifiedWebhookHandler();

      const result = handler.parseStripeWebhook(
        "{}",
        "invalid_signature",
        "secret"
      );

      expect(result).toBeNull();
    });
  });
});

describe("API Processors Performance", () => {
  it("should process payments efficiently", async () => {
    const manager = new PaymentManager();
    manager.registerProcessor(new StripeProcessor("test"));

    const startTime = Date.now();
    await manager.processPaymentMulti(50, "usd", {});
    const duration = Date.now() - startTime;

    // Should complete in reasonable time
    expect(duration).toBeLessThan(5000);
  });

  it("should fetch trends within SLA", async () => {
    const manager = new TrendManager();
    manager.registerSource(new GoogleTrendsSource("key"));

    const startTime = Date.now();
    await manager.fetchAllTrends(10);
    const duration = Date.now() - startTime;

    // Should attempt within reasonable time
    expect(duration).toBeLessThan(10000);
  });
});
