/**
 * Base Service Class
 *
 * Abstract base for all services providing:
 * - Database integration
 * - API client management
 * - Caching
 * - Logging
 * - Error handling
 * - Event publishing
 */

import { DatabaseManager } from "../database";
import { ApiClient } from "../apis";

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: string;
  enabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
  cacheTTL?: number; // milliseconds
  logger?: any;
}

/**
 * Service context with all dependencies
 */
export interface ServiceContext {
  config: ServiceConfig;
  db: DatabaseManager;
  api?: ApiClient;
  cache?: Map<string, { value: any; expiry: number }>;
  logger: ServiceLogger;
}

/**
 * Service logger
 */
export interface ServiceLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any, data?: any): void;
}

/**
 * Operation result
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: Date;
  duration: number;
}

/**
 * Service metrics
 */
export interface ServiceMetrics {
  operationsTotal: number;
  operationsSuccessful: number;
  operationsFailed: number;
  averageResponseTimeMs: number;
  cacheHitRate: number;
  lastError?: {
    message: string;
    timestamp: Date;
  };
}

/**
 * Base service class
 */
export abstract class BaseService {
  protected config: ServiceConfig;
  protected db: DatabaseManager;
  protected api?: ApiClient;
  protected cache: Map<string, { value: any; expiry: number }>;
  protected logger: ServiceLogger;
  protected metrics: ServiceMetrics;
  protected name: string;

  constructor(ctx: ServiceContext) {
    this.name = ctx.config.name;
    this.config = ctx.config;
    this.db = ctx.db;
    this.api = ctx.api;
    this.cache = ctx.cache || new Map();
    this.logger = ctx.logger;

    this.metrics = {
      operationsTotal: 0,
      operationsSuccessful: 0,
      operationsFailed: 0,
      averageResponseTimeMs: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    this.logger.info(`Initializing service: ${this.name}`);
    // Can be overridden by subclasses
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down service: ${this.name}`);
    this.cache.clear();
  }

  /**
   * Get cached value
   */
  protected getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiry
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  /**
   * Set cache value
   */
  protected setCached<T>(
    key: string,
    value: T,
    ttlMs: number = this.config.cacheTTL || 60000
  ): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Clear cache for pattern
   */
  protected clearCachePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Execute operation with timing and metrics
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    cacheKey?: string
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();

    try {
      // Check cache
      if (cacheKey) {
        const cached = this.getCached<T>(cacheKey);
        if (cached !== null) {
          this.logger.debug(`Cache hit: ${operationName}`, { cacheKey });
          this.metrics.operationsTotal++;
          this.metrics.operationsSuccessful++;
          return {
            success: true,
            data: cached,
            timestamp: new Date(),
            duration: Date.now() - startTime,
          };
        }
      }

      // Execute operation
      this.logger.debug(`Executing operation: ${operationName}`);
      const result = await operation();

      // Cache result if key provided
      if (cacheKey && result !== undefined) {
        this.setCached(cacheKey, result);
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(true, duration);

      return {
        success: true,
        data: result,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Operation failed: ${operationName}`, error);
      this.updateMetrics(false, duration);

      return {
        success: false,
        error: errorMessage,
        code: "OPERATION_FAILED",
        timestamp: new Date(),
        duration,
      };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts || 3,
    initialDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts) {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`,
            {
              error: lastError.message,
            }
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate input
   */
  protected validate(data: any, schema: Record<string, string>): boolean {
    for (const [field, type] of Object.entries(schema)) {
      if (!(field in data)) {
        this.logger.error(`Missing required field: ${field}`);
        return false;
      }

      if (typeof data[field] !== type) {
        this.logger.error(
          `Invalid type for field ${field}: expected ${type}, got ${typeof data[field]}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Update metrics
   */
  private updateMetrics(success: boolean, durationMs: number): void {
    this.metrics.operationsTotal++;

    if (success) {
      this.metrics.operationsSuccessful++;
    } else {
      this.metrics.operationsFailed++;
      this.metrics.lastError = {
        message: "Operation failed",
        timestamp: new Date(),
      };
    }

    // Calculate average response time
    const avgDuration =
      (this.metrics.averageResponseTimeMs * (this.metrics.operationsTotal - 1) +
        durationMs) /
      this.metrics.operationsTotal;

    this.metrics.averageResponseTimeMs = Math.round(avgDuration);

    // Calculate cache hit rate
    const totalCached = this.cache.size;
    if (totalCached > 0) {
      this.metrics.cacheHitRate = Math.round((totalCached / 100) * 100); // Simplified
    }
  }

  /**
   * Get service metrics
   */
  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      operationsTotal: 0,
      operationsSuccessful: 0,
      operationsFailed: 0,
      averageResponseTimeMs: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Check database
      const dbStats = this.db.getStatistics();
      if (!dbStats) {
        return {
          healthy: false,
          message: "Database unavailable",
        };
      }

      return {
        healthy: true,
        message: `Service ${this.name} is healthy`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Service ${this.name} health check failed: ${error}`,
      };
    }
  }
}

/**
 * Create service logger
 */
export function createServiceLogger(serviceName: string): ServiceLogger {
  return {
    debug: (message: string, data?: any) => {
      console.debug(`[${serviceName}] ${message}`, data);
    },
    info: (message: string, data?: any) => {
      console.info(`[${serviceName}] ${message}`, data);
    },
    warn: (message: string, data?: any) => {
      console.warn(`[${serviceName}] ${message}`, data);
    },
    error: (message: string, error?: any, data?: any) => {
      console.error(
        `[${serviceName}] ${message}`,
        error instanceof Error ? error.message : error,
        data
      );
    },
  };
}

export { BaseService };
