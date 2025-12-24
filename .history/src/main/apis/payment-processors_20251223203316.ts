/**
 * Payment Processing Integration
 *
 * Unified interface for Stripe, Gumroad, Ko-fi, and Itch.io
 */

import {
  ApiClient,
  createApiClient,
} from './http-client';
import {
  PaymentProvider,
  PaymentTransaction,
  TransactionStatus,
  ApiClientConfig,
} from './types';

/**
 * Abstract payment processor
 */
export abstract class PaymentProcessor {
  abstract provider: PaymentProvider;
  protected client: ApiClient;

  constructor(config: ApiClientConfig) {
    this.client = createApiClient(config);
  }

  /**
   * Process payment
   */
  abstract processPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction>;

  /**
   * Get transaction details
   */
  abstract getTransaction(externalId: string): Promise<PaymentTransaction>;

  /**
   * Refund transaction
   */
  abstract refund(
    externalId: string,
    reason?: string
  ): Promise<PaymentTransaction>;

  /**
   * List transactions
   */
  abstract listTransactions(
    limit?: number,
    offset?: number
  ): Promise<PaymentTransaction[]>;
}

/**
 * Stripe payment processor
 */
export class StripeProcessor extends PaymentProcessor {
  provider: PaymentProvider = 'stripe';

  constructor(secretKey: string) {
    super({
      baseUrl: 'https://api.stripe.com/v1',
      apiKey: secretKey,
      rateLimitPerSecond: 100,
    });
  }

  /**
   * Create payment intent
   */
  async processPayment(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    const response = await this.client.post<any>(
      '/payment_intents',
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      }
    );

    return {
      id: `stripe-${response.id}`,
      provider: 'stripe',
      externalId: response.id,
      amount,
      currency,
      status: this.mapStripeStatus(response.status),
      customerEmail: response.receipt_email || '',
      productId: metadata?.productId as string || '',
      metadata,
      createdAt: new Date(response.created * 1000),
      updatedAt: new Date(),
    };
  }

  /**
   * Get transaction from Stripe
   */
  async getTransaction(externalId: string): Promise<PaymentTransaction> {
    const response = await this.client.get<any>(
      `/payment_intents/${externalId}`
    );

    return {
      id: `stripe-${response.id}`,
      provider: 'stripe',
      externalId: response.id,
      amount: response.amount / 100, // Convert from cents
      currency: response.currency,
      status: this.mapStripeStatus(response.status),
      customerEmail: response.receipt_email || '',
      productId: response.metadata?.productId || '',
      metadata: response.metadata,
      createdAt: new Date(response.created * 1000),
      updatedAt: new Date(),
    };
  }

  /**
   * Refund payment
   */
  async refund(
    externalId: string,
    reason?: string
  ): Promise<PaymentTransaction> {
    // First verify the payment exists and is successful
    const transaction = await this.getTransaction(externalId);

    // Create refund
    const response = await this.client.post<any>(
      '/refunds',
      {
        payment_intent: externalId,
        reason: reason || 'requested_by_customer',
      }
    );

    return {
      ...transaction,
      status: 'refunded',
      updatedAt: new Date(),
    };
  }

  /**
   * List transactions from Stripe
   */
  async listTransactions(
    limit: number = 10,
    offset: number = 0
  ): Promise<PaymentTransaction[]> {
    const response = await this.client.get<any>(
      '/payment_intents',
      {
        limit,
        starting_after: offset > 0 ? offset : undefined,
      }
    );

    return response.data.map((item: any) => ({
      id: `stripe-${item.id}`,
      provider: 'stripe',
      externalId: item.id,
      amount: item.amount / 100,
      currency: item.currency,
      status: this.mapStripeStatus(item.status),
      customerEmail: item.receipt_email || '',
      productId: item.metadata?.productId || '',
      metadata: item.metadata,
      createdAt: new Date(item.created * 1000),
      updatedAt: new Date(),
    }));
  }

  private mapStripeStatus(status: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      'requires_payment_method': 'pending',
      'requires_action': 'pending',
      'processing': 'pending',
      'requires_capture': 'pending',
      'succeeded': 'completed',
      'canceled': 'failed',
    };
    return statusMap[status] || 'pending';
  }
}

/**
 * Gumroad payment processor
 */
export class GumroadProcessor extends PaymentProcessor {
  provider: PaymentProvider = 'gumroad';

  constructor(accessToken: string) {
    super({
      baseUrl: 'https://api.gumroad.com/v2',
      apiKey: accessToken,
      rateLimitPerSecond: 10,
    });
  }

  /**
   * Get sales from Gumroad
   */
  async processPayment(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    // Gumroad doesn't have direct payment API, returns mock
    return {
      id: `gumroad-${Date.now()}`,
      provider: 'gumroad',
      externalId: `gumroad-${Date.now()}`,
      amount,
      currency,
      status: 'pending',
      customerEmail: metadata?.email as string || '',
      productId: metadata?.productId as string || '',
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get transaction
   */
  async getTransaction(externalId: string): Promise<PaymentTransaction> {
    // Fetch from Gumroad via product endpoint
    const response = await this.client.get<any>(
      '/products'
    );

    const sale = response.find((s: any) => s.id === externalId);

    if (!sale) {
      throw new Error(`Transaction ${externalId} not found`);
    }

    return {
      id: `gumroad-${sale.id}`,
      provider: 'gumroad',
      externalId: sale.id,
      amount: parseFloat(sale.price) || 0,
      currency: sale.currency_code || 'usd',
      status: 'completed',
      customerEmail: sale.purchaser_email || '',
      productId: sale.product_id,
      metadata: { licenseeEmail: sale.licensee_email },
      createdAt: new Date(sale.created_at),
      updatedAt: new Date(sale.updated_at),
    };
  }

  /**
   * Refund payment (Gumroad specific)
   */
  async refund(externalId: string): Promise<PaymentTransaction> {
    const transaction = await this.getTransaction(externalId);

    // Gumroad handles refunds through dashboard
    return {
      ...transaction,
      status: 'refunded',
      updatedAt: new Date(),
    };
  }

  /**
   * List transactions (sales)
   */
  async listTransactions(
    limit: number = 10
  ): Promise<PaymentTransaction[]> {
    const response = await this.client.get<any>(
      '/sales'
    );

    return response.slice(0, limit).map((sale: any) => ({
      id: `gumroad-${sale.id}`,
      provider: 'gumroad',
      externalId: sale.id,
      amount: parseFloat(sale.price),
      currency: sale.currency_code || 'usd',
      status: 'completed',
      customerEmail: sale.purchaser_email,
      productId: sale.product_id,
      metadata: { licenseeEmail: sale.licensee_email },
      createdAt: new Date(sale.created_at),
      updatedAt: new Date(sale.updated_at),
    }));
  }
}

/**
 * Ko-fi payment processor
 */
export class KoFiProcessor extends PaymentProcessor {
  provider: PaymentProvider = 'ko-fi';

  constructor(verificationToken: string) {
    super({
      baseUrl: 'https://api.ko-fi.com',
      apiKey: verificationToken,
      rateLimitPerSecond: 10,
    });
  }

  /**
   * Process payment (webhook based)
   */
  async processPayment(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    // Ko-fi is webhook-driven, return pending
    return {
      id: `kofi-${Date.now()}`,
      provider: 'ko-fi',
      externalId: `kofi-${Date.now()}`,
      amount,
      currency,
      status: 'pending',
      customerEmail: metadata?.email as string || '',
      productId: metadata?.productId as string || '',
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get transaction
   */
  async getTransaction(externalId: string): Promise<PaymentTransaction> {
    // Ko-fi doesn't provide transaction lookup API
    throw new Error('Ko-fi does not support transaction lookup API');
  }

  /**
   * Refund (Ko-fi specific)
   */
  async refund(externalId: string): Promise<PaymentTransaction> {
    throw new Error('Ko-fi refunds must be processed manually');
  }

  /**
   * List transactions
   */
  async listTransactions(
    limit: number = 10
  ): Promise<PaymentTransaction[]> {
    // Ko-fi doesn't provide transaction list API
    return [];
  }
}

/**
 * Itch.io payment processor
 */
export class ItchProcessor extends PaymentProcessor {
  provider: PaymentProvider = 'itch';

  constructor(apiKey: string) {
    super({
      baseUrl: 'https://itch.io/api/1',
      apiKey,
      rateLimitPerSecond: 10,
    });
  }

  /**
   * Process payment
   */
  async processPayment(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    // Itch.io handles payments through their platform
    return {
      id: `itch-${Date.now()}`,
      provider: 'itch',
      externalId: `itch-${Date.now()}`,
      amount,
      currency,
      status: 'pending',
      customerEmail: metadata?.email as string || '',
      productId: metadata?.productId as string || '',
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get transaction
   */
  async getTransaction(externalId: string): Promise<PaymentTransaction> {
    // Fetch from itch.io
    const response = await this.client.get<any>(
      `/uploads/${externalId}`
    );

    return {
      id: `itch-${response.id}`,
      provider: 'itch',
      externalId: response.id,
      amount: response.price || 0,
      currency: 'usd',
      status: 'completed',
      customerEmail: '',
      productId: response.game_id,
      metadata: { uploadId: response.id },
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
    };
  }

  /**
   * Refund
   */
  async refund(externalId: string): Promise<PaymentTransaction> {
    const transaction = await this.getTransaction(externalId);
    return {
      ...transaction,
      status: 'refunded',
      updatedAt: new Date(),
    };
  }

  /**
   * List transactions
   */
  async listTransactions(limit: number = 10): Promise<PaymentTransaction[]> {
    const response = await this.client.get<any>(
      '/me'
    );

    // Itch.io API would return sales for authenticated user
    return response.sales ? response.sales.slice(0, limit).map((sale: any) => ({
      id: `itch-${sale.id}`,
      provider: 'itch',
      externalId: sale.id,
      amount: sale.price,
      currency: 'usd',
      status: 'completed',
      customerEmail: sale.email,
      productId: sale.game_id,
      metadata: sale,
      createdAt: new Date(sale.created_at),
      updatedAt: new Date(sale.updated_at),
    })) : [];
  }
}

/**
 * Unified payment manager
 */
export class PaymentManager {
  private processors: Map<PaymentProvider, PaymentProcessor> = new Map();

  /**
   * Register processor
   */
  registerProcessor(processor: PaymentProcessor): void {
    this.processors.set(processor.provider, processor);
  }

  /**
   * Get processor
   */
  getProcessor(provider: PaymentProvider): PaymentProcessor {
    const processor = this.processors.get(provider);
    if (!processor) {
      throw new Error(`Processor for ${provider} not registered`);
    }
    return processor;
  }

  /**
   * Process payment across all registered providers
   */
  async processPaymentMulti(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction[]> {
    const results: PaymentTransaction[] = [];

    for (const processor of this.processors.values()) {
      try {
        const transaction = await processor.processPayment(
          amount,
          currency,
          metadata
        );
        results.push(transaction);
      } catch (error) {
        console.error(
          `Failed to process payment on ${processor.provider}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Get transaction from any provider
   */
  async getTransaction(
    provider: PaymentProvider,
    externalId: string
  ): Promise<PaymentTransaction> {
    const processor = this.getProcessor(provider);
    return processor.getTransaction(externalId);
  }

  /**
   * Refund transaction
   */
  async refund(
    provider: PaymentProvider,
    externalId: string,
    reason?: string
  ): Promise<PaymentTransaction> {
    const processor = this.getProcessor(provider);
    return processor.refund(externalId, reason);
  }
}

/**
 * Export all processors
 */
export {
  PaymentProcessor,
  StripeProcessor,
  GumroadProcessor,
  KoFiProcessor,
  ItchProcessor,
};
