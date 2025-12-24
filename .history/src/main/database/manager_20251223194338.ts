/**
 * Database Manager
 *
 * Coordinates database initialization, repositories, and lifecycle
 */

import { SQLiteDatabase } from './sqlite';
import { DatabaseConfig, DatabaseType } from './types';
import {
  TemplateRepository,
  BuildJobRepository,
  TrendRepository,
  PublishedAppRepository,
  SalesMetricsRepository,
} from './repositories';
import { AllSchemas, schemaToSQL } from './schema';
import * as path from 'path';

/**
 * Database Manager - singleton pattern
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLiteDatabase | null = null;
  private initialized = false;

  // Repositories
  templates!: TemplateRepository;
  buildJobs!: BuildJobRepository;
  trends!: TrendRepository;
  publishedApps!: PublishedAppRepository;
  salesMetrics!: SalesMetricsRepository;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database
   */
  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) {
      console.warn('[DatabaseManager] Already initialized, skipping');
      return;
    }

    try {
      console.log('[DatabaseManager] Initializing database...');

      // Create SQLite instance
      this.db = new SQLiteDatabase({
        type: DatabaseType.SQLITE,
        path: config.path || path.join(process.cwd(), 'appforge.db'),
        database: config.database,
        logging: config.logging ?? false,
      });

      // Initialize connection
      await this.db.initialize();
      console.log('[DatabaseManager] Database connection established');

      // Create tables
      await this.createTables();
      console.log('[DatabaseManager] Tables created');

      // Initialize repositories
      this.templates = new TemplateRepository(this.db);
      this.buildJobs = new BuildJobRepository(this.db);
      this.trends = new TrendRepository(this.db);
      this.publishedApps = new PublishedAppRepository(this.db);
      this.salesMetrics = new SalesMetricsRepository(this.db);

      // Run migrations
      await this.db.migrate();
      console.log('[DatabaseManager] Migrations completed');

      this.initialized = true;
      console.log('[DatabaseManager] Initialization complete');
    } catch (error) {
      console.error('[DatabaseManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create all tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const schema of AllSchemas) {
      const sql = schemaToSQL(schema);
      await this.db.execute(sql);
      console.log(`[DatabaseManager] Created table: ${schema.name}`);
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get database statistics
   */
  getStats() {
    if (!this.db) return null;
    return this.db.getStats();
  }

  /**
   * Reset statistics
   */
  resetStats() {
    if (this.db) {
      this.db.resetStats();
    }
  }

  /**
   * Close database
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[DatabaseManager] Database closed');
    }
  }

  /**
   * Run transaction
   */
  async transaction<T>(
    callback: (manager: DatabaseManager) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db.transaction(async () => {
      return callback(this);
    });
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;

    const tables = [
      'sales_metrics',
      'channel_auth',
      'published_apps',
      'trends',
      'build_jobs',
      'templates',
    ];

    for (const table of tables) {
      await this.db.execute(`DELETE FROM ${table}`);
    }

    console.log('[DatabaseManager] All data cleared');
  }

  /**
   * Export health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
  }> {
    try {
      if (!this.initialized || !this.db) {
        return {
          status: 'unhealthy',
          message: 'Database not initialized',
        };
      }

      // Test query
      const result = await this.db.query('SELECT 1 as test');

      if (result.count === 0) {
        return {
          status: 'unhealthy',
          message: 'Database query failed',
        };
      }

      return {
        status: 'healthy',
        message: 'Database connection healthy',
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error.message}`,
      };
    }
  }
}

/**
 * Get database manager instance
 */
export function getDatabaseManager(): DatabaseManager {
  return DatabaseManager.getInstance();
}
