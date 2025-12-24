/**
 * Trend Service
 *
 * Business logic for trend management:
 * - Trend discovery and tracking
 * - Trend correlation and analysis
 * - Trend archiving
 * - Event publishing
 */

import { BaseService, ServiceContext, OperationResult } from './base.service';
import { EventBus, EventPublisher } from './event-bus';

/**
 * Trend data
 */
export interface Trend {
  id: string;
  title: string;
  description?: string;
  source: 'twitter' | 'tiktok' | 'reddit' | 'google';
  trendingScore: number;
  volume: number;
  momentum: number;
  discoveredAt: Date;
  archivedAt?: Date;
  correlations: string[]; // IDs of related trends
  metadata?: Record<string, any>;
}

/**
 * Trend service
 */
export class TrendService extends BaseService {
  private eventPublisher: EventPublisher;
  private tableName = 'trends';

  constructor(ctx: ServiceContext, eventBus?: EventBus) {
    super(ctx);
    this.eventPublisher = new EventPublisher(eventBus || new EventBus());
  }

  /**
   * Discover trend
   */
  async discoverTrend(
    title: string,
    source: string,
    volume: number = 100
  ): Promise<OperationResult<Trend>> {
    return this.executeOperation('discoverTrend', async () => {
      // Check if trend already exists
      const existing = await this.db.query(
        `SELECT id FROM ${this.tableName} WHERE title = ? AND source = ? AND archived_at IS NULL`,
        [title, source]
      );

      if (existing.length > 0) {
        // Update existing trend
        return this.updateTrendVolume(existing[0].id, volume).then((r) => r.data!);
      }

      // Create new trend
      const trend: Trend = {
        id: `trnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        source: source as any,
        trendingScore: this.calculateTrendingScore(volume),
        volume,
        momentum: 1.0,
        discoveredAt: new Date(),
        correlations: [],
      };

      // Insert into database
      await this.db.execute(
        `INSERT INTO ${this.tableName} (id, title, source, score, volume, momentum, data, discovered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trend.id,
          trend.title,
          trend.source,
          trend.trendingScore,
          trend.volume,
          trend.momentum,
          JSON.stringify(trend),
          trend.discoveredAt,
        ]
      );

      // Publish event
      await this.eventPublisher.publish('trend.discovered', 'trend-service', {
        trendId: trend.id,
        title: trend.title,
        source: trend.source,
      });

      // Clear cache
      this.clearCachePattern(`^trends_`);

      return trend;
    });
  }

  /**
   * Update trend volume and momentum
   */
  private async updateTrendVolume(trendId: string, newVolume: number): Promise<OperationResult<Trend>> {
    return this.executeOperation('updateTrendVolume', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [trendId]
      );

      if (results.length === 0) {
        throw new Error(`Trend not found: ${trendId}`);
      }

      const trend: Trend = JSON.parse(results[0].data);

      // Calculate momentum (ratio of new to old volume)
      const momentum = newVolume / (trend.volume || 1);

      const updated: Trend = {
        ...trend,
        volume: newVolume,
        momentum,
        trendingScore: this.calculateTrendingScore(newVolume, momentum),
      };

      await this.db.execute(
        `UPDATE ${this.tableName} SET data = ?, score = ?, volume = ?, momentum = ? WHERE id = ?`,
        [JSON.stringify(updated), updated.trendingScore, updated.volume, updated.momentum, trendId]
      );

      return updated;
    });
  }

  /**
   * Calculate trending score based on volume and momentum
   */
  private calculateTrendingScore(volume: number, momentum: number = 1.0): number {
    // Simple formula: sqrt(volume) * log(momentum)
    const volumeScore = Math.sqrt(volume);
    const momentumScore = Math.log(Math.max(momentum, 1.001)); // Avoid log(0)

    return Math.round((volumeScore * momentumScore) * 100) / 100;
  }

  /**
   * Archive trend
   */
  async archiveTrend(trendId: string): Promise<OperationResult<Trend>> {
    return this.executeOperation('archiveTrend', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [trendId]
      );

      if (results.length === 0) {
        throw new Error(`Trend not found: ${trendId}`);
      }

      const trend: Trend = JSON.parse(results[0].data);

      const archived: Trend = {
        ...trend,
        archivedAt: new Date(),
      };

      await this.db.execute(
        `UPDATE ${this.tableName} SET archived_at = ?, data = ? WHERE id = ?`,
        [archived.archivedAt, JSON.stringify(archived), trendId]
      );

      // Publish event
      await this.eventPublisher.publish('trend.archived', 'trend-service', {
        trendId,
      });

      // Clear cache
      this.clearCachePattern(`^trends_`);

      return archived;
    });
  }

  /**
   * Get trending trends (active, sorted by score)
   */
  async getTrendingTrends(limit: number = 50): Promise<OperationResult<Trend[]>> {
    const cacheKey = `trending_trends_${limit}`;

    return this.executeOperation(
      'getTrendingTrends',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} 
           WHERE archived_at IS NULL
           ORDER BY score DESC, discovered_at DESC
           LIMIT ?`,
          [limit]
        );

        return results.map((r) => JSON.parse(r.data) as Trend);
      },
      cacheKey
    );
  }

  /**
   * Get trends by source
   */
  async getTrendsBySource(
    source: string,
    limit: number = 50
  ): Promise<OperationResult<Trend[]>> {
    return this.executeOperation(
      'getTrendsBySource',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName}
           WHERE source = ? AND archived_at IS NULL
           ORDER BY score DESC
           LIMIT ?`,
          [source, limit]
        );

        return results.map((r) => JSON.parse(r.data) as Trend);
      },
      `trends_source_${source}`
    );
  }

  /**
   * Find related trends (correlation)
   */
  async findRelatedTrends(trendId: string): Promise<OperationResult<Trend[]>> {
    return this.executeOperation('findRelatedTrends', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [trendId]
      );

      if (results.length === 0) {
        throw new Error(`Trend not found: ${trendId}`);
      }

      const trend: Trend = JSON.parse(results[0].data);

      if (trend.correlations.length === 0) {
        return [];
      }

      // Query related trends
      const placeholders = trend.correlations.map(() => '?').join(',');
      const relatedResults = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id IN (${placeholders}) AND archived_at IS NULL`,
        trend.correlations
      );

      return relatedResults.map((r) => JSON.parse(r.data) as Trend);
    });
  }

  /**
   * Correlate trends (find and link related trends)
   */
  async correlateTrends(trendId: string): Promise<OperationResult<void>> {
    return this.executeOperation('correlateTrends', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [trendId]
      );

      if (results.length === 0) {
        throw new Error(`Trend not found: ${trendId}`);
      }

      const trend: Trend = JSON.parse(results[0].data);

      // Simple correlation: find trends with similar titles
      const similarResults = await this.db.query(
        `SELECT id FROM ${this.tableName} 
         WHERE id != ? AND archived_at IS NULL
         AND (
           title LIKE ? OR 
           INSTR(title, ?) > 0
         )
         LIMIT 10`,
        [trendId, `%${trend.title}%`, trend.title.split(' ')[0]]
      );

      const correlatedIds = similarResults.map((r) => r.id);

      if (correlatedIds.length > 0) {
        const updated: Trend = {
          ...trend,
          correlations: correlatedIds,
        };

        await this.db.execute(
          `UPDATE ${this.tableName} SET data = ? WHERE id = ?`,
          [JSON.stringify(updated), trendId]
        );

        // Publish event
        await this.eventPublisher.publish('trend.correlated', 'trend-service', {
          trendId,
          correlatedCount: correlatedIds.length,
        });
      }
    });
  }

  /**
   * Get trend history
   */
  async getTrendHistory(trendId: string): Promise<OperationResult<any[]>> {
    return this.executeOperation('getTrendHistory', async () => {
      const results = await this.db.query(
        `SELECT created_at, score, volume, momentum FROM trend_history 
         WHERE trend_id = ?
         ORDER BY created_at DESC
         LIMIT 100`,
        [trendId]
      );

      return results.map((r) => ({
        timestamp: r.created_at,
        score: r.score,
        volume: r.volume,
        momentum: r.momentum,
      }));
    });
  }

  /**
   * Get emerging trends (high momentum)
   */
  async getEmergingTrends(limit: number = 20): Promise<OperationResult<Trend[]>> {
    const cacheKey = `emerging_trends_${limit}`;

    return this.executeOperation(
      'getEmergingTrends',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName}
           WHERE archived_at IS NULL AND momentum > 1.5
           ORDER BY momentum DESC, score DESC
           LIMIT ?`,
          [limit]
        );

        return results.map((r) => JSON.parse(r.data) as Trend);
      },
      cacheKey
    );
  }

  /**
   * Search trends by title
   */
  async searchTrends(query: string, limit: number = 50): Promise<OperationResult<Trend[]>> {
    return this.executeOperation(
      'searchTrends',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName}
           WHERE (title LIKE ? OR description LIKE ?) AND archived_at IS NULL
           ORDER BY score DESC
           LIMIT ?`,
          [`%${query}%`, `%${query}%`, limit]
        );

        return results.map((r) => JSON.parse(r.data) as Trend);
      },
      `search_trends_${query}`
    );
  }
}

/**
 * Create trend service
 */
export function createTrendService(ctx: ServiceContext, eventBus?: EventBus): TrendService {
  return new TrendService(ctx, eventBus);
}
