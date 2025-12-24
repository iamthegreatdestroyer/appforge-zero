/**
 * Webhook Handlers for External APIs
 *
 * Process webhooks from:
 * - Payment processors (Stripe, Gumroad, Ko-fi, Itch.io)
 * - Real-time updates
 */

import * as crypto from "crypto";
import {
  WebhookPayload,
  WebhookEventType,
  WebhookHandlerResult,
  PaymentTransaction,
  TransactionStatus,
} from "./types";

/**
 * Webhook signature verifier
 */
export class SignatureVerifier {
  /**
   * Verify Stripe signature
   */
  static verifyStripe(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Stripe format: t=timestamp,v1=hash
    const [, stripeHash] = signature.split("v1=");
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(stripeHash || "")
    );
  }

  /**
   * Verify Gumroad signature
   */
  static verifyGumroad(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  /**
   * Verify Ko-fi signature
   */
  static verifyKoFi(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  /**
   * Verify generic HMAC signature
   */
  static verifyHMAC(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = "sha256"
  ): boolean {
    const hash = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }
}

/**
 * Webhook event processor
 */
export class WebhookProcessor {
  private handlers: Map<
    WebhookEventType,
    Array<(payload: WebhookPayload) => Promise<WebhookHandlerResult>>
  > = new Map();

  /**
   * Register event handler
   */
  onEvent(
    eventType: WebhookEventType,
    handler: (payload: WebhookPayload) => Promise<WebhookHandlerResult>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Process webhook
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookHandlerResult> {
    const handlers = this.handlers.get(payload.eventType) || [];

    if (handlers.length === 0) {
      return {
        success: true,
        message: `No handlers for event type ${payload.eventType}`,
      };
    }

    const results = await Promise.allSettled(
      handlers.map((handler) => handler(payload))
    );

    const errors = results
      .map((r) => (r.status === "rejected" ? r.reason.message : null))
      .filter((msg) => msg !== null);

    if (errors.length > 0) {
      return {
        success: false,
        message: `${errors.length} handler(s) failed`,
        error: errors.join("; "),
      };
    }

    return {
      success: true,
      message: `${results.length} handler(s) processed`,
    };
  }
}

/**
 * Stripe webhook handler
 */
export class StripeWebhookHandler {
  private processor: WebhookProcessor;

  constructor(processor: WebhookProcessor) {
    this.processor = processor;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Payment intent succeeded
    this.processor.onEvent("payment.completed", async (payload) =>
      this.handlePaymentCompleted(payload)
    );

    // Payment intent failed
    this.processor.onEvent("payment.failed", async (payload) =>
      this.handlePaymentFailed(payload)
    );

    // Charge refunded
    this.processor.onEvent("payment.refunded", async (payload) =>
      this.handlePaymentRefunded(payload)
    );
  }

  private async handlePaymentCompleted(
    payload: WebhookPayload
  ): Promise<WebhookHandlerResult> {
    const { intentId, amount, currency, customerId } = payload.data;

    // Process completed payment
    console.log(
      `Payment completed: ${intentId}, Amount: ${amount} ${currency}`
    );

    return {
      success: true,
      message: "Payment processed",
      processedId: intentId as string,
    };
  }

  private async handlePaymentFailed(
    payload: WebhookPayload
  ): Promise<WebhookHandlerResult> {
    const { intentId, failureReason } = payload.data;

    console.error(`Payment failed: ${intentId}, Reason: ${failureReason}`);

    return {
      success: true,
      message: "Payment failure recorded",
      processedId: intentId as string,
    };
  }

  private async handlePaymentRefunded(
    payload: WebhookPayload
  ): Promise<WebhookHandlerResult> {
    const { chargeId, refundId, amount } = payload.data;

    console.log(`Refund processed: ${refundId}, Amount: ${amount}`);

    return {
      success: true,
      message: "Refund processed",
      processedId: refundId as string,
    };
  }
}

/**
 * Gumroad webhook handler
 */
export class GumroadWebhookHandler {
  private processor: WebhookProcessor;

  constructor(processor: WebhookProcessor) {
    this.processor = processor;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.processor.onEvent("payment.completed", async (payload) =>
      this.handleSaleCreated(payload)
    );
  }

  private async handleSaleCreated(
    payload: WebhookPayload
  ): Promise<WebhookHandlerResult> {
    const { purchaser_email, price, product_name, license_key } = payload.data;

    console.log(`Sale recorded: ${purchaser_email} purchased ${product_name}`);

    return {
      success: true,
      message: "Sale processed",
      processedId: license_key as string,
    };
  }
}

/**
 * Ko-fi webhook handler
 */
export class KoFiWebhookHandler {
  private processor: WebhookProcessor;

  constructor(processor: WebhookProcessor) {
    this.processor = processor;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.processor.onEvent("payment.completed", async (payload) =>
      this.handlePaymentCreated(payload)
    );
  }

  private async handlePaymentCreated(
    payload: WebhookPayload
  ): Promise<WebhookHandlerResult> {
    const { from_name, amount, message, payment_id } = payload.data;

    console.log(
      `Ko-fi contribution: ${from_name} sent $${amount}. Message: ${message}`
    );

    return {
      success: true,
      message: "Contribution recorded",
      processedId: payment_id as string,
    };
  }
}

/**
 * Itch.io webhook handler
 */
export class ItchWebhookHandler {
  private processor: WebhookProcessor;

  constructor(processor: WebhookProcessor) {
    this.processor = processor;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.processor.onEvent("payment.completed", async (payload) =>
      this.handleDownloadCreated(payload)
    );
  }

  private async handleDownloadCreated(
    payload: WebhookPayload
  ): Promise<WebhookHandlerResult> {
    const { user_id, game_id, purchase_id } = payload.data;

    console.log(`Itch.io download: User ${user_id} purchased game ${game_id}`);

    return {
      success: true,
      message: "Purchase recorded",
      processedId: purchase_id as string,
    };
  }
}

/**
 * Unified webhook handler
 */
export class UnifiedWebhookHandler {
  private processor: WebhookProcessor;
  private stripeHandler: StripeWebhookHandler;
  private gumroadHandler: GumroadWebhookHandler;
  private koFiHandler: KoFiWebhookHandler;
  private itchHandler: ItchWebhookHandler;

  constructor() {
    this.processor = new WebhookProcessor();
    this.stripeHandler = new StripeWebhookHandler(this.processor);
    this.gumroadHandler = new GumroadWebhookHandler(this.processor);
    this.koFiHandler = new KoFiWebhookHandler(this.processor);
    this.itchHandler = new ItchWebhookHandler(this.processor);
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(payload: WebhookPayload): Promise<WebhookHandlerResult> {
    return this.processor.processWebhook(payload);
  }

  /**
   * Parse Stripe webhook
   */
  parseStripeWebhook(
    body: string,
    signature: string,
    secret: string
  ): WebhookPayload | null {
    try {
      if (!SignatureVerifier.verifyStripe(body, signature, secret)) {
        throw new Error("Invalid signature");
      }

      const data = JSON.parse(body);
      const type = data.type as WebhookEventType;

      return {
        eventId: data.id,
        eventType: type,
        timestamp: new Date(data.created * 1000),
        provider: "stripe",
        data: data.data.object || {},
        signature,
      };
    } catch (error) {
      console.error("Failed to parse Stripe webhook:", error);
      return null;
    }
  }

  /**
   * Parse Gumroad webhook
   */
  parseGumroadWebhook(
    body: string,
    signature: string,
    secret: string
  ): WebhookPayload | null {
    try {
      if (!SignatureVerifier.verifyGumroad(body, signature, secret)) {
        throw new Error("Invalid signature");
      }

      const data = JSON.parse(body);

      return {
        eventId: data.id,
        eventType: "payment.completed",
        timestamp: new Date(),
        provider: "gumroad",
        data: data || {},
        signature,
      };
    } catch (error) {
      console.error("Failed to parse Gumroad webhook:", error);
      return null;
    }
  }

  /**
   * Parse Ko-fi webhook
   */
  parseKoFiWebhook(
    body: string,
    signature: string,
    secret: string
  ): WebhookPayload | null {
    try {
      if (!SignatureVerifier.verifyKoFi(body, signature, secret)) {
        throw new Error("Invalid signature");
      }

      const data = JSON.parse(body);

      return {
        eventId: data.id || `kofi-${Date.now()}`,
        eventType: "payment.completed",
        timestamp: new Date(),
        provider: "ko-fi",
        data: data || {},
        signature,
      };
    } catch (error) {
      console.error("Failed to parse Ko-fi webhook:", error);
      return null;
    }
  }

  /**
   * Parse Itch.io webhook
   */
  parseItchWebhook(
    body: string,
    signature: string,
    secret: string
  ): WebhookPayload | null {
    try {
      if (!SignatureVerifier.verifyHMAC(body, signature, secret)) {
        throw new Error("Invalid signature");
      }

      const data = JSON.parse(body);

      return {
        eventId: data.id || `itch-${Date.now()}`,
        eventType: "payment.completed",
        timestamp: new Date(),
        provider: "itch",
        data: data || {},
        signature,
      };
    } catch (error) {
      console.error("Failed to parse Itch webhook:", error);
      return null;
    }
  }
}

export {
  SignatureVerifier,
  WebhookProcessor,
  StripeWebhookHandler,
  GumroadWebhookHandler,
  KoFiWebhookHandler,
  ItchWebhookHandler,
  UnifiedWebhookHandler,
};
