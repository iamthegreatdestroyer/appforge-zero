/**
 * Repository Pattern Implementation
 *
 * Generic repositories for data access with type safety
 */

import {
  Repository,
  Database,
  WhereCondition,
  QueryOptions,
  QueryResult,
} from "./types";

/**
 * Generic repository base class
 */
export abstract class BaseRepository<T> implements Repository<T> {
  abstract tableName: string;
  abstract fromRow(row: any): T;
  abstract toRow(entity: T): any;

  constructor(protected db: Database) {}

  /**
   * Find by ID
   */
  async findById(id: any): Promise<T | null> {
    const result = await this.db.query<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );

    if (result.count === 0) return null;
    return this.fromRow(result.rows[0]);
  }

  /**
   * Find all with options
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    let query = this.db.select<any>().from(this.tableName);

    if (options?.orderBy) {
      query = query.orderBy(options.orderBy, options.ascending !== false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const result = await query.execute();
    return result.rows.map((row) => this.fromRow(row));
  }

  /**
   * Find with where conditions
   */
  async findWhere(
    conditions: WhereCondition,
    options?: QueryOptions
  ): Promise<T[]> {
    let query = this.db.select<any>().from(this.tableName).where(conditions);

    if (options?.orderBy) {
      query = query.orderBy(options.orderBy, options.ascending !== false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const result = await query.execute();
    return result.rows.map((row) => this.fromRow(row));
  }

  /**
   * Create entity
   */
  async create(data: Partial<T>): Promise<T> {
    const row = this.toRow(data as T);
    const result = await this.db
      .insert<any>()
      .into(this.tableName)
      .values(row)
      .execute();

    // Return the created entity
    return this.fromRow(row);
  }

  /**
   * Update entity
   */
  async update(id: any, data: Partial<T>): Promise<T> {
    const row = this.toRow(data as T);
    await this.db
      .update<any>()
      .table(this.tableName)
      .set(row)
      .where({ id })
      .execute();

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Entity with id ${id} not found after update`);
    }

    return updated;
  }

  /**
   * Delete entity
   */
  async delete(id: any): Promise<boolean> {
    const result = await this.db
      .delete()
      .from(this.tableName)
      .where({ id })
      .execute();

    return result.changes! > 0;
  }

  /**
   * Count entities
   */
  async count(conditions?: WhereCondition): Promise<number> {
    let query = this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}${
        conditions ? " WHERE " + this.whereClause(conditions) : ""
      }`
    );

    const result = await query;
    return result.rows[0]?.count || 0;
  }

  /**
   * Helper to build where clause
   */
  protected whereClause(conditions: WhereCondition): string {
    return Object.entries(conditions)
      .map(([key, value]) => {
        if (value === null) return `${key} IS NULL`;
        return `${key} = '${value}'`;
      })
      .join(" AND ");
  }
}

/**
 * Template Repository
 */
export class TemplateRepository extends BaseRepository<any> {
  tableName = "templates";

  fromRow(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      version: row.version,
      author: row.author,
      morphTransformation: JSON.parse(row.morphTransformation),
      stats: JSON.parse(row.stats),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  toRow(entity: any) {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      category: entity.category,
      version: entity.version,
      author: entity.author,
      morphTransformation: JSON.stringify(entity.morphTransformation),
      stats: JSON.stringify(entity.stats),
      updatedAt: new Date(),
    };
  }

  /**
   * Find templates by category
   */
  async findByCategory(
    category: string,
    options?: QueryOptions
  ): Promise<any[]> {
    return this.findWhere({ category }, options);
  }

  /**
   * Search templates
   */
  async search(query: string, category?: string): Promise<any[]> {
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE title LIKE ? OR description LIKE ?
    `;
    const params: any[] = [`%${query}%`, `%${query}%`];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    const result = await this.db.query<any>(sql, params);
    return result.rows.map((row) => this.fromRow(row));
  }

  /**
   * Update statistics
   */
  async updateStats(id: string, stats: any): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.tableName} SET stats = ?, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(stats), new Date(), id]
    );
  }
}

/**
 * Build Job Repository
 */
export class BuildJobRepository extends BaseRepository<any> {
  tableName = "build_jobs";

  fromRow(row: any) {
    return {
      id: row.id,
      appId: row.appId,
      status: row.status,
      progress: row.progress,
      configuration: JSON.parse(row.configuration),
      artifacts: JSON.parse(row.artifacts),
      logs: JSON.parse(row.logs),
      startTime: row.startTime ? new Date(row.startTime) : null,
      endTime: row.endTime ? new Date(row.endTime) : null,
      error: row.error ? JSON.parse(row.error) : null,
      createdAt: new Date(row.createdAt),
    };
  }

  toRow(entity: any) {
    return {
      id: entity.id,
      appId: entity.appId,
      status: entity.status,
      progress: entity.progress,
      configuration: JSON.stringify(entity.configuration),
      artifacts: JSON.stringify(entity.artifacts),
      logs: JSON.stringify(entity.logs),
      startTime: entity.startTime,
      endTime: entity.endTime,
      error: entity.error ? JSON.stringify(entity.error) : null,
    };
  }

  /**
   * Find builds by app
   */
  async findByApp(appId: string): Promise<any[]> {
    return this.findWhere(
      { appId },
      { orderBy: "createdAt", ascending: false }
    );
  }

  /**
   * Find builds by status
   */
  async findByStatus(status: string): Promise<any[]> {
    return this.findWhere({ status });
  }

  /**
   * Update progress
   */
  async updateProgress(id: string, progress: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.tableName} SET progress = ? WHERE id = ?`,
      [progress, id]
    );
  }

  /**
   * Complete build
   */
  async completeBuild(id: string, artifacts: any[]): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.tableName} SET status = ?, artifacts = ?, endTime = ? WHERE id = ?`,
      ["completed", JSON.stringify(artifacts), new Date(), id]
    );
  }
}

/**
 * Trend Repository
 */
export class TrendRepository extends BaseRepository<any> {
  tableName = "trends";

  fromRow(row: any) {
    return {
      id: row.id,
      keyword: row.keyword,
      category: row.category,
      source: row.source,
      metrics: JSON.parse(row.metrics),
      analysis: row.analysis ? JSON.parse(row.analysis) : null,
      archived: Boolean(row.archived),
      discoveredAt: new Date(row.discoveredAt),
      archivedAt: row.archivedAt ? new Date(row.archivedAt) : null,
    };
  }

  toRow(entity: any) {
    return {
      id: entity.id,
      keyword: entity.keyword,
      category: entity.category,
      source: entity.source,
      metrics: JSON.stringify(entity.metrics),
      analysis: entity.analysis ? JSON.stringify(entity.analysis) : null,
      archived: entity.archived ? 1 : 0,
      archivedAt: entity.archivedAt,
    };
  }

  /**
   * Find active trends
   */
  async findActive(category?: string): Promise<any[]> {
    return this.findWhere({ archived: 0, ...(category && { category }) });
  }

  /**
   * Find trending by category
   */
  async findByCategory(category: string): Promise<any[]> {
    return this.findWhere(
      { category, archived: 0 },
      { orderBy: "discoveredAt", ascending: false }
    );
  }

  /**
   * Archive trend
   */
  async archive(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.tableName} SET archived = 1, archivedAt = ? WHERE id = ?`,
      [new Date(), id]
    );
  }
}

/**
 * Published App Repository
 */
export class PublishedAppRepository extends BaseRepository<any> {
  tableName = "published_apps";

  fromRow(row: any) {
    return {
      id: row.id,
      appId: row.appId,
      channel: row.channel,
      name: row.name,
      version: row.version,
      status: row.status,
      url: row.url,
      revenue: row.revenue,
      downloads: row.downloads,
      publishDate: row.publishDate ? new Date(row.publishDate) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  toRow(entity: any) {
    return {
      id: entity.id,
      appId: entity.appId,
      channel: entity.channel,
      name: entity.name,
      version: entity.version,
      status: entity.status,
      url: entity.url,
      revenue: entity.revenue,
      downloads: entity.downloads,
      publishDate: entity.publishDate,
      updatedAt: new Date(),
    };
  }

  /**
   * Find by app
   */
  async findByApp(appId: string): Promise<any[]> {
    return this.findWhere({ appId });
  }

  /**
   * Find by channel
   */
  async findByChannel(channel: string): Promise<any[]> {
    return this.findWhere({ channel });
  }
}

/**
 * Sales Metrics Repository
 */
export class SalesMetricsRepository extends BaseRepository<any> {
  tableName = "sales_metrics";

  fromRow(row: any) {
    return {
      id: row.id,
      appId: row.appId,
      channel: row.channel,
      date: new Date(row.date),
      revenue: row.revenue,
      downloads: row.downloads,
      purchases: row.purchases,
      refunds: row.refunds,
    };
  }

  toRow(entity: any) {
    return {
      id: entity.id,
      appId: entity.appId,
      channel: entity.channel,
      date: entity.date,
      revenue: entity.revenue,
      downloads: entity.downloads,
      purchases: entity.purchases,
      refunds: entity.refunds,
    };
  }

  /**
   * Get metrics for app in date range
   */
  async getMetricsForApp(
    appId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE appId = ? AND date BETWEEN ? AND ?
      ORDER BY date ASC
    `;

    const result = await this.db.query<any>(sql, [appId, startDate, endDate]);
    return result.rows.map((row) => this.fromRow(row));
  }

  /**
   * Get total revenue
   */
  async getTotalRevenue(appId: string): Promise<number> {
    const sql = `SELECT SUM(revenue) as total FROM ${this.tableName} WHERE appId = ?`;
    const result = await this.db.query<any>(sql, [appId]);
    return result.rows[0]?.total || 0;
  }
}
