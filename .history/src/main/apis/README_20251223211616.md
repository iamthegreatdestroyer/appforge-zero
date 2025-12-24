# APIs Module - External API Integration

## Overview

The APIs module provides unified interfaces for integrating AppForge Zero with external services:

- **Payment Processing** (4 providers)
- **Trend Discovery** (4 sources)
- **APK Building** (Gradle + signing)
- **Cloud Storage** (2 providers)
- **Webhook Handling** (Event processing)

## Quick Start

### Payment Processing

```typescript
import { PaymentManager, StripeProcessor } from "@apis";

const manager = new PaymentManager();
manager.registerProcessor(new StripeProcessor(process.env.STRIPE_SECRET_KEY!));

// Process payment
const transaction = await manager
  .getProcessor("stripe")
  .processPayment(99.99, "usd", { productId: "my-app" });

console.log("Payment ID:", transaction.id);
console.log("Status:", transaction.status);
```

### Trend Discovery

```typescript
import { TrendManager, TwitterTrendSource } from "@apis";

const manager = new TrendManager();
manager.registerSource(
  new TwitterTrendSource(process.env.TWITTER_BEARER_TOKEN!)
);

// Fetch trending topics
const trends = await manager.fetchAllTrends(20);

trends.forEach((trend) => {
  console.log(`${trend.title}: ${trend.searchVolume} searches`);
});
```

### APK Building

```typescript
import { ApkBuilder } from "@apis";

const builder = new ApkBuilder();

const result = await builder.buildApk({
  appName: "My App",
  appId: "com.example.myapp",
  version: "1.0.0",
  minSdk: 21,
  targetSdk: 33,
  appIconPath: "/path/to/icon.png",
  assetsPath: "/path/to/assets",
  permissions: ["INTERNET", "CAMERA"],
  features: ["android.hardware.camera"],
});

if (result.success) {
  console.log(`Built APK: ${result.appPath}`);
  console.log(`Size: ${result.size} bytes`);
  console.log(`Build time: ${result.buildTime}ms`);
}
```

### Cloud Storage

```typescript
import { CloudStorageManager, GoogleDriveProvider } from "@apis";

const manager = new CloudStorageManager();
manager.registerProvider(
  new GoogleDriveProvider(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REFRESH_TOKEN!
  )
);

// Upload file
const file = await manager
  .getProvider("google-drive")
  .uploadFile("/local/file.zip", "/remote/file.zip");

console.log("Uploaded:", file.name, `(${file.size} bytes)`);
```

### Webhook Handling

```typescript
import { UnifiedWebhookHandler } from "@apis";

const handler = new UnifiedWebhookHandler();

// Parse incoming webhook (from Express, etc)
const webhook = handler.parseStripeWebhook(
  req.rawBody,
  req.headers["stripe-signature"] as string,
  process.env.STRIPE_WEBHOOK_SECRET!
);

if (webhook) {
  // Process webhook
  const result = await handler.handleWebhook(webhook);
  console.log("Webhook processed:", result);
}
```

## Supported Providers

### Payment Processors

| Provider    | Features                           | Status   |
| ----------- | ---------------------------------- | -------- |
| **Stripe**  | Payment intents, refunds, webhooks | ✅ Full  |
| **Gumroad** | Sales, licenses, webhooks          | ✅ Full  |
| **Ko-fi**   | Contributions, tipping             | ✅ Basic |
| **Itch.io** | Game purchases, uploads            | ✅ Basic |

### Trend Sources

| Source            | Features                    | Status   |
| ----------------- | --------------------------- | -------- |
| **Twitter/X**     | Trending topics, search     | ✅ Full  |
| **TikTok**        | Hashtags, sounds, discovery | ✅ Basic |
| **Reddit**        | Trending posts, subreddits  | ✅ Full  |
| **Google Trends** | Search trends, daily        | ✅ Full  |

### Cloud Storage

| Provider         | Features                       | Status  |
| ---------------- | ------------------------------ | ------- |
| **Google Drive** | Upload, download, list, delete | ✅ Full |
| **Dropbox**      | Upload, download, sync         | ✅ Full |

## Configuration

### Environment Variables

Create `.env` file with your API credentials:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twitter/X
TWITTER_BEARER_TOKEN=AAAA...

# TikTok
TIKTOK_CLIENT_ID=...
TIKTOK_CLIENT_SECRET=...

# Reddit
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...

# Google Drive
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Dropbox
DROPBOX_ACCESS_TOKEN=...
```

## API Reference

### HTTP Client

```typescript
// Create client with configuration
const client = createApiClient({
  baseUrl: "https://api.example.com",
  apiKey: "your-key",
  retryAttempts: 3,
  rateLimitPerSecond: 100,
  timeout: 30000,
});

// Make requests
const data = await client.get("/users");
const result = await client.post("/orders", { amount: 100 });
const updated = await client.put("/users/123", { name: "John" });
const deleted = await client.delete("/users/123");

// Rate limiting info
const info = client.getRateLimitInfo();
console.log(`Requests remaining: ${info.remaining}`);
```

### Payment Manager

```typescript
const manager = new PaymentManager();

// Register providers
manager.registerProcessor(new StripeProcessor(key));
manager.registerProcessor(new GumroadProcessor(token));

// Process payment on specific provider
const txn = await manager
  .getProcessor("stripe")
  .processPayment(amount, currency, metadata);

// Process across all providers
const results = await manager.processPaymentMulti(amount, currency, metadata);

// Get transaction
const transaction = await manager.getTransaction("stripe", "pi_...");

// Refund
const refunded = await manager.refund("stripe", "pi_...", "reason");
```

### Trend Manager

```typescript
const manager = new TrendManager();

// Register sources
manager.registerSource(new TwitterTrendSource(token));
manager.registerSource(new RedditTrendSource(id, secret, user, pass));

// Fetch from all
const trends = await manager.fetchAllTrends(20);

// Search on specific source
const results = await manager.searchTrend("twitter", "gaming");

// Search across all
const allResults = await manager.searchTrendMulti("gaming");
```

### APK Builder

```typescript
const builder = new ApkBuilder("/tmp/builds");

// Build APK
const result = await builder.buildApk({
  appName: "My App",
  appId: "com.example.app",
  version: "1.0.0",
  minSdk: 21,
  targetSdk: 33,
  appIconPath: "/path/to/icon.png",
  assetsPath: "/path/to/assets",
  permissions: ["INTERNET"],
  features: [],
  signingKey: {
    keyStorePath: "/path/to/keystore.jks",
    keyStorePassword: "password",
    keyAlias: "key",
    keyPassword: "keypass",
  },
});

// Check result
if (result.success) {
  console.log(`APK: ${result.appPath}`);
  console.log(`Size: ${result.size} bytes`);
  console.log(`Time: ${result.buildTime}ms`);
}

// Cleanup
await builder.cleanupBuild(projectPath);
```

### Cloud Storage Manager

```typescript
const manager = new CloudStorageManager();

// Register providers
manager.registerProvider(new GoogleDriveProvider(id, secret, token));
manager.registerProvider(new DropboxProvider(token));

// Upload to specific
const file = await manager
  .getProvider("google-drive")
  .uploadFile("/local/file", "/remote/file");

// Upload to all
const files = await manager.uploadFileMulti("/local/file", "/remote/file");

// List files
const items = await manager.getProvider("dropbox").listFiles("/folder", 100);

// Sync directories
const results = await manager.syncDirectoryMulti(
  "/local/assets",
  "/remote/assets"
);

for (const [provider, result] of results) {
  console.log(`${provider}: ${result.filesUploaded} uploaded`);
}
```

### Webhook Handler

```typescript
const handler = new UnifiedWebhookHandler();

// Parse webhook from Stripe
const webhook = handler.parseStripeWebhook(body, signature, secret);

// Parse from Gumroad
const webhook = handler.parseGumroadWebhook(body, signature, secret);

// Parse from Ko-fi
const webhook = handler.parseKoFiWebhook(body, signature, secret);

// Parse from Itch.io
const webhook = handler.parseItchWebhook(body, signature, secret);

// Process
if (webhook) {
  const result = await handler.handleWebhook(webhook);
  console.log("Processed:", result);
}
```

## Error Handling

```typescript
try {
  const result = await client.post("/payment", { amount: 100 });
} catch (error) {
  if (error.code === "TIMEOUT") {
    console.log("Request timed out");
  } else if (error.code === "RATE_LIMITED") {
    console.log(`Retry after ${error.retryAfterMs}ms`);
  } else {
    console.error("Error:", error.message);
  }
}
```

## Performance Optimization

### Rate Limiting

```typescript
// Automatic rate limiting
const client = createApiClient({
  rateLimitPerSecond: 100,
});

// Client respects rates automatically
for (let i = 0; i < 1000; i++) {
  await client.get(`/items/${i}`); // Won't exceed 100 req/s
}
```

### Retry Logic

```typescript
// Automatic retries with exponential backoff
const client = createApiClient({
  retryAttempts: 3,
  retryDelayMs: 1000,
});

// On failure: retries at 1s, 2s, 4s delays
const result = await client.get("/unstable-api");
```

### Parallel Processing

```typescript
// Process multiple requests in parallel
const [stripe, gumroad, kofi] = await Promise.all([
  new StripeProcessor(key).processPayment(amount, "usd"),
  new GumroadProcessor(token).processPayment(amount, "usd"),
  new KoFiProcessor(token).processPayment(amount, "usd"),
]);
```

## Testing

```typescript
import { describe, it, expect } from "vitest";
import { PaymentManager, StripeProcessor } from "@apis";

describe("Payments", () => {
  it("should process Stripe payment", async () => {
    const manager = new PaymentManager();
    manager.registerProcessor(new StripeProcessor(testKey));

    const result = await manager
      .getProcessor("stripe")
      .processPayment(99.99, "usd");

    expect(result.provider).toBe("stripe");
    expect(result.status).toBe("pending");
  });
});
```

## Troubleshooting

### Rate Limit Exceeded

```
Message: Too many requests
Solution: Increase rateLimitPerSecond or add delays between requests
```

### Invalid Signature

```
Message: Webhook signature verification failed
Solution: Check webhook secret matches provider's configuration
```

### APK Build Failed

```
Message: Gradle not found
Solution: Install Android SDK and add gradle to PATH
```

### Cloud Storage Upload Failed

```
Message: Authentication failed
Solution: Refresh OAuth tokens or check API credentials
```

## See Also

- [Phase 5 Completion Report](../PHASE_5_COMPLETION_REPORT.md)
- [Database Layer](../database/README.md)
- [Service Layer](../services/README.md)
