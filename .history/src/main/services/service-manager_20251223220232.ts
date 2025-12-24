/**
 * Service Manager
 *
 * Coordinates all services:
 * - Template service
 * - Payment service
 * - Trend service
 * - Build service
 * - Integration with database, APIs, events
 */

import {
  BaseService,
  ServiceConfig,
  ServiceContext,
  createServiceLogger,
} from "./base.service";
import { DatabaseManager } from "../database";
import { ApiClient } from "../apis";
import { EventBus } from "./event-bus";
import { WorkflowEngine } from "./workflow-engine";

/**
 * Service registry
 */
export interface ServiceRegistry {
  template: any;
  payment: any;
  trend: any;
  build: any;
  [key: string]: any;
}

/**
 * Service manager configuration
 */
export interface ServiceManagerConfig {
  database: DatabaseManager;
  apiClient?: ApiClient;
  eventBus?: EventBus;
  workflowEngine?: WorkflowEngine;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * Service manager
 */
export class ServiceManager {
  private config: ServiceManagerConfig;
  private services: Map<string, BaseService> = new Map();
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private eventBus: EventBus;
  private workflowEngine: WorkflowEngine;
  private logger = createServiceLogger("ServiceManager");

  constructor(config: ServiceManagerConfig) {
    this.config = config;
    this.eventBus = config.eventBus || new EventBus(config.database);
    this.workflowEngine =
      config.workflowEngine || new WorkflowEngine(this.eventBus);
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing ServiceManager");

    try {
      // All services initialized on startup
      this.logger.info("ServiceManager initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize ServiceManager", error);
      throw error;
    }
  }

  /**
   * Register service
   */
  registerService(name: string, service: BaseService): void {
    this.services.set(name, service);
    this.logger.info(`Registered service: ${name}`);
  }

  /**
   * Get service
   */
  getService(name: string): BaseService | undefined {
    return this.services.get(name);
  }

  /**
   * Execute service operation
   */
  async executeServiceOperation<T>(
    serviceName: string,
    operationName: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const service = this.getService(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    this.logger.debug(`Executing ${serviceName}.${operationName}`, params);

    // This would delegate to actual service methods
    // For now, just log and throw
    throw new Error(
      `Operation not implemented: ${serviceName}.${operationName}`
    );
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get workflow engine
   */
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }

  /**
   * Get database
   */
  getDatabase(): DatabaseManager {
    return this.config.database;
  }

  /**
   * Get API client
   */
  getApiClient(): ApiClient | undefined {
    return this.config.apiClient;
  }

  /**
   * Cache operation
   */
  async getCached<T>(key: string): Promise<T | null> {
    if (!this.config.cacheEnabled) {
      return null;
    }

    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  /**
   * Set cache
   */
  async setCached<T>(
    key: string,
    value: T,
    ttlMs: number = this.config.cacheTTL || 60000
  ): Promise<void> {
    if (!this.config.cacheEnabled) {
      return;
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Health check all services
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, service] of this.services.entries()) {
      try {
        const health = await service.healthCheck();
        results[name] = health.healthy;
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Get all service metrics
   */
  getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [name, service] of this.services.entries()) {
      metrics[name] = service.getMetrics();
    }

    return metrics;
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    this.logger.info("Shutting down ServiceManager");

    for (const [name, service] of this.services.entries()) {
      try {
        await service.shutdown();
        this.logger.info(`Shut down service: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to shut down service ${name}`, error);
      }
    }

    this.cache.clear();
  }
}

/**
 * Create service manager
 */
export function createServiceManager(
  config: ServiceManagerConfig
): ServiceManager {
  return new ServiceManager(config);
}

/**
 * Service manager instance (singleton)
 */
let serviceManagerInstance: ServiceManager | null = null;

/**
 * Initialize service manager (singleton)
 */
export function initializeServiceManager(
  config: ServiceManagerConfig
): ServiceManager {
  if (!serviceManagerInstance) {
    serviceManagerInstance = new ServiceManager(config);
  }
  return serviceManagerInstance;
}

/**
 * Get service manager instance
 */
export function getServiceManager(): ServiceManager {
  if (!serviceManagerInstance) {
    throw new Error(
      "ServiceManager not initialized. Call initializeServiceManager first."
    );
  }
  return serviceManagerInstance;
}
