/**
 * Payment Service
 *
 * Business logic for payment processing:
 * - Multi-provider payment processing (Stripe, Gumroad, Ko-fi, Itch.io)
 * - Transaction tracking
 * - Revenue analytics
 * - Webhook handling
 */

import { BaseService, ServiceContext, OperationResult, createServiceLogger } from './base.service';
import { EventBus, EventPublisher } from './event-bus';
import { ApiClient } from '../apis';

/**
 * Payment transaction
 */
export interface Transaction {
  id: string;
  provider: 'stripe' | 'gumroad' | 'kofi' | 'itchio';
  status: 'initiated' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  templateId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
  refundedAt?: Date;
  error?: string;
}

/**
 * Payment service
 */
export class PaymentService extends BaseService {
  private eventPublisher: EventPublisher;
  private tableName = 'transactions';

  constructor(ctx: ServiceContext, eventBus?: EventBus) {
    super(ctx);
    this.eventPublisher = new EventPublisher(eventBus || new EventBus());
  }

  /**
   * Process payment
   */
  async processPayment(
    provider: string,
    templateId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<OperationResult<Transaction>> {
    return this.executeOperation('processPayment', async () => {
      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: provider as any,
        status: 'initiated',
        amount,
        currency,
        templateId,
        createdAt: new Date(),
      };

      // Store in database
      await this.db.execute(
        `INSERT INTO ${this.tableName} (id, provider, status, amount, currency, template_id, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.provider,
          transaction.status,
          transaction.amount,
          transaction.currency,
          transaction.templateId,
          JSON.stringify(transaction),
          transaction.createdAt,
        ]
      );

      // Publish initiated event
      await this.eventPublisher.publish('payment.initiated', 'payment-service', {
        transactionId: transaction.id,
        provider,
        amount,
        templateId,
      });

      // Process with provider API
      try {
        const result = await this.processWithProvider(provider, transaction);

        // Update transaction status
        const updatedTransaction: Transaction = {
          ...transaction,
          status: 'completed',
          completedAt: new Date(),
        };

        await this.db.execute(
          `UPDATE ${this.tableName} SET status = ?, completed_at = ?, data = ? WHERE id = ?`,
          [
            updatedTransaction.status,
            updatedTransaction.completedAt,
            JSON.stringify(updatedTransaction),
            transaction.id,
          ]
        );

        // Publish completed event
        await this.eventPublisher.publish('payment.completed', 'payment-service', {
          transactionId: transaction.id,
          provider,
          amount,
          templateId,
        });

        return updatedTransaction;
      } catch (error) {
        // Update transaction with error
        const failedTransaction: Transaction = {
          ...transaction,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        };

        await this.db.execute(
          `UPDATE ${this.tableName} SET status = ?, error = ?, data = ? WHERE id = ?`,
          [
            failedTransaction.status,
            failedTransaction.error,
            JSON.stringify(failedTransaction),
            transaction.id,
          ]
        );

        // Publish failed event
        await this.eventPublisher.publish('payment.failed', 'payment-service', {
          transactionId: transaction.id,
          provider,
          error: failedTransaction.error,
        });

        throw error;
      }
    });
  }

  /**
   * Process payment with provider
   */
  private async processWithProvider(
    provider: string,
    transaction: Transaction
  ): Promise<any> {
    if (!this.api) {
      throw new Error('API client not configured');
    }

    // Use API client to process payment
    const result = await this.api.processPayment({
      provider,
      amount: transaction.amount,
      currency: transaction.currency,
      templateId: transaction.templateId,
      metadata: {
        transactionId: transaction.id,
      },
    });

    return result;
  }

  /**
   * Refund transaction
   */
  async refundTransaction(transactionId: string): Promise<OperationResult<Transaction>> {
    return this.executeOperation('refundTransaction', async () => {
      // Get transaction
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [transactionId]
      );

      if (results.length === 0) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const transaction: Transaction = JSON.parse(results[0].data);

      if (transaction.status !== 'completed') {
        throw new Error(`Cannot refund transaction with status: ${transaction.status}`);
      }

      // Process refund with provider
      try {
        if (this.api) {
          await this.api.refundPayment({
            provider: transaction.provider,
            transactionId,
          });
        }

        // Update transaction
        const refundedTransaction: Transaction = {
          ...transaction,
          status: 'refunded',
          refundedAt: new Date(),
        };

        await this.db.execute(
          `UPDATE ${this.tableName} SET status = ?, refunded_at = ?, data = ? WHERE id = ?`,
          [
            refundedTransaction.status,
            refundedTransaction.refundedAt,
            JSON.stringify(refundedTransaction),
            transactionId,
          ]
        );

        // Publish refunded event
        await this.eventPublisher.publish('payment.refunded', 'payment-service', {
          transactionId,
          amount: transaction.amount,
        });

        return refundedTransaction;
      } catch (error) {
        this.logger.error('Refund failed', error);
        throw error;
      }
    });
  }

  /**
   * Get transaction
   */
  async getTransaction(transactionId: string): Promise<OperationResult<Transaction | null>> {
    return this.executeOperation(
      'getTransaction',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} WHERE id = ?`,
          [transactionId]
        );

        if (results.length === 0) {
          return null;
        }

        return JSON.parse(results[0].data) as Transaction;
      },
      `transaction_${transactionId}`
    );
  }

  /**
   * Get transactions for template
   */
  async getTemplateTransactions(
    templateId: string,
    limit: number = 100
  ): Promise<OperationResult<Transaction[]>> {
    const cacheKey = `template_transactions_${templateId}`;

    return this.executeOperation(
      'getTemplateTransactions',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} 
           WHERE template_id = ? AND status = 'completed'
           ORDER BY created_at DESC 
           LIMIT ?`,
          [templateId, limit]
        );

        return results.map((r) => JSON.parse(r.data) as Transaction);
      },
      cacheKey
    );
  }

  /**
   * Get revenue summary
   */
  async getRevenueSummary(templateId?: string): Promise<OperationResult<any>> {
    const cacheKey = `revenue_summary_${templateId || 'all'}`;

    return this.executeOperation(
      'getRevenueSummary',
      async () => {
        let sql = `SELECT 
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(amount) as avg_transaction,
          currency
          FROM ${this.tableName}
          WHERE status = 'completed'`;

        const params: any[] = [];

        if (templateId) {
          sql += ` AND template_id = ?`;
          params.push(templateId);
        }

        sql += ` GROUP BY currency`;

        const results = await this.db.query(sql, params);

        return results.map((r) => ({
          currency: r.currency,
          totalRevenue: r.total_revenue || 0,
          transactionCount: r.transaction_count || 0,
          averageTransaction: r.avg_transaction || 0,
        }));
      },
      cacheKey
    );
  }

  /**
   * Get transactions by provider
   */
  async getTransactionsByProvider(
    provider: string,
    limit: number = 100
  ): Promise<OperationResult<Transaction[]>> {
    return this.executeOperation(
      'getTransactionsByProvider',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} 
           WHERE provider = ? AND status IN ('completed', 'refunded')
           ORDER BY created_at DESC 
           LIMIT ?`,
          [provider, limit]
        );

        return results.map((r) => JSON.parse(r.data) as Transaction);
      },
      `transactions_${provider}`
    );
  }

  /**
   * Get failed transactions
   */
  async getFailedTransactions(limit: number = 50): Promise<OperationResult<Transaction[]>> {
    const cacheKey = `failed_transactions_${limit}`;

    return this.executeOperation(
      'getFailedTransactions',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} 
           WHERE status = 'failed'
           ORDER BY created_at DESC 
           LIMIT ?`,
          [limit]
        );

        return results.map((r) => JSON.parse(r.data) as Transaction);
      },
      cacheKey
    );
  }

  /**
   * Retry failed payment
   */
  async retryFailedPayment(transactionId: string): Promise<OperationResult<Transaction>> {
    return this.executeOperation('retryFailedPayment', async () => {
      // Get failed transaction
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [transactionId]
      );

      if (results.length === 0) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const transaction: Transaction = JSON.parse(results[0].data);

      if (transaction.status !== 'failed') {
        throw new Error(`Cannot retry transaction with status: ${transaction.status}`);
      }

      // Retry processing
      const updatedTransaction = await this.processPayment(
        transaction.provider,
        transaction.templateId || '',
        transaction.amount,
        transaction.currency
      );

      return updatedTransaction.data || transaction;
    });
  }
}

/**
 * Create payment service
 */
export function createPaymentService(ctx: ServiceContext, eventBus?: EventBus): PaymentService {
  return new PaymentService(ctx, eventBus);
}
