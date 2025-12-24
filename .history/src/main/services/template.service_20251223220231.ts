/**
 * Template Service
 *
 * Business logic for template management:
 * - CRUD operations with caching
 * - Template search and filtering
 * - Template archiving
 * - Event publishing
 */

import {
  BaseService,
  ServiceContext,
  OperationResult,
  createServiceLogger,
} from "./base.service";
import { EventBus, EventPublisher } from "./event-bus";
import { DatabaseManager } from "../database";
import { Template } from "./types";

/**
 * Template service
 */
export class TemplateService extends BaseService {
  private eventPublisher: EventPublisher;
  private tableName = "templates";

  constructor(ctx: ServiceContext, eventBus?: EventBus) {
    super(ctx);
    this.eventPublisher = new EventPublisher(eventBus || new EventBus());
  }

  /**
   * Create template
   */
  async createTemplate(
    data: Partial<Template>
  ): Promise<OperationResult<Template>> {
    return this.executeOperation("createTemplate", async () => {
      if (!data.title || !data.category) {
        throw new Error("Title and category are required");
      }

      const template: Template = {
        id: `tpl_${Date.now()}`,
        title: data.title,
        description: data.description || "",
        category: data.category,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: "1.0.0",
        metadata: data.metadata || {},
        morphTransformation: data.morphTransformation || {
          characters: {},
          settings: {},
          narrative: {},
        },
        stats: {
          downloads: 0,
          rating: 0,
          reviews: 0,
        },
      };

      // Insert into database
      await this.db.execute(
        `INSERT INTO ${this.tableName} (id, title, description, category, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          template.id,
          template.title,
          template.description,
          template.category,
          JSON.stringify(template),
          template.createdAt,
          template.updatedAt,
        ]
      );

      // Publish event
      await this.eventPublisher.publish(
        "template.created",
        "template-service",
        {
          templateId: template.id,
          title: template.title,
          category: template.category,
        }
      );

      // Clear list cache
      this.clearCachePattern(`^templates_list`);

      return template;
    });
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<OperationResult<Template | null>> {
    return this.executeOperation(
      "getTemplate",
      async () => {
        const result = await this.db.query(
          `SELECT data FROM ${this.tableName} WHERE id = ?`,
          [id]
        );

        if (result.length === 0) {
          return null;
        }

        return JSON.parse(result[0].data) as Template;
      },
      `template_${id}`
    );
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    updates: Partial<Template>
  ): Promise<OperationResult<Template>> {
    return this.executeOperation("updateTemplate", async () => {
      // Get current template
      const result = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [id]
      );

      if (result.length === 0) {
        throw new Error(`Template not found: ${id}`);
      }

      const template: Template = {
        ...JSON.parse(result[0].data),
        ...updates,
        id, // Preserve ID
        updatedAt: new Date(),
      };

      // Update database
      await this.db.execute(
        `UPDATE ${this.tableName} SET data = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(template), template.updatedAt, id]
      );

      // Publish event
      await this.eventPublisher.publish(
        "template.updated",
        "template-service",
        {
          templateId: id,
          changes: Object.keys(updates),
        }
      );

      // Clear caches
      this.clearCachePattern(`^template_${id}`);
      this.clearCachePattern(`^templates_list`);

      return template;
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<OperationResult<void>> {
    return this.executeOperation("deleteTemplate", async () => {
      // Soft delete
      await this.db.execute(
        `UPDATE ${this.tableName} SET deleted_at = ? WHERE id = ?`,
        [new Date(), id]
      );

      // Publish event
      await this.eventPublisher.publish(
        "template.deleted",
        "template-service",
        {
          templateId: id,
        }
      );

      // Clear caches
      this.clearCachePattern(`^template_${id}`);
      this.clearCachePattern(`^templates_list`);
    });
  }

  /**
   * Archive template
   */
  async archiveTemplate(id: string): Promise<OperationResult<Template>> {
    return this.executeOperation("archiveTemplate", async () => {
      const result = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [id]
      );

      if (result.length === 0) {
        throw new Error(`Template not found: ${id}`);
      }

      const template: Template = {
        ...JSON.parse(result[0].data),
        metadata: {
          ...(JSON.parse(result[0].data) as Template).metadata,
          archived: true,
          archivedAt: new Date(),
        },
        updatedAt: new Date(),
      };

      await this.db.execute(
        `UPDATE ${this.tableName} SET data = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(template), template.updatedAt, id]
      );

      // Publish event
      await this.eventPublisher.publish(
        "template.archived",
        "template-service",
        {
          templateId: id,
        }
      );

      // Clear caches
      this.clearCachePattern(`^template_`);
      this.clearCachePattern(`^templates_list`);

      return template;
    });
  }

  /**
   * Search templates
   */
  async searchTemplates(
    query: string,
    category?: string,
    limit: number = 50
  ): Promise<OperationResult<Template[]>> {
    const cacheKey = `templates_list_${query}_${category}_${limit}`;

    return this.executeOperation(
      "searchTemplates",
      async () => {
        let sql = `SELECT data FROM ${this.tableName} WHERE deleted_at IS NULL`;
        const params: any[] = [];

        if (query) {
          sql += ` AND (title LIKE ? OR description LIKE ?)`;
          params.push(`%${query}%`, `%${query}%`);
        }

        if (category) {
          sql += ` AND category = ?`;
          params.push(category);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);

        const results = await this.db.query(sql, params);

        return results.map((r) => JSON.parse(r.data) as Template);
      },
      cacheKey
    );
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: string,
    limit: number = 50
  ): Promise<OperationResult<Template[]>> {
    return this.searchTemplates("", category, limit);
  }

  /**
   * Get trending templates
   */
  async getTrendingTemplates(
    limit: number = 20
  ): Promise<OperationResult<Template[]>> {
    const cacheKey = `templates_trending_${limit}`;

    return this.executeOperation(
      "getTrendingTemplates",
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} 
           WHERE deleted_at IS NULL 
           ORDER BY stats_downloads DESC, stats_rating DESC 
           LIMIT ?`,
          [limit]
        );

        return results.map((r) => JSON.parse(r.data) as Template);
      },
      cacheKey
    );
  }

  /**
   * Increment download count
   */
  async incrementDownloads(id: string): Promise<OperationResult<void>> {
    return this.executeOperation("incrementDownloads", async () => {
      await this.db.execute(
        `UPDATE ${this.tableName} SET stats_downloads = stats_downloads + 1 WHERE id = ?`,
        [id]
      );

      // Clear cache
      this.clearCachePattern(`^template_${id}`);
    });
  }

  /**
   * Add template review
   */
  async addReview(
    templateId: string,
    rating: number,
    comment: string
  ): Promise<OperationResult<void>> {
    return this.executeOperation("addReview", async () => {
      // Store review
      await this.db.execute(
        `INSERT INTO template_reviews (template_id, rating, comment, created_at)
         VALUES (?, ?, ?, ?)`,
        [templateId, rating, comment, new Date()]
      );

      // Update template stats
      const results = await this.db.query(
        `SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM template_reviews WHERE template_id = ?`,
        [templateId]
      );

      if (results.length > 0) {
        const { count, avg_rating } = results[0];
        await this.db.execute(
          `UPDATE ${this.tableName} SET stats_reviews = ?, stats_rating = ? WHERE id = ?`,
          [count, avg_rating, templateId]
        );
      }

      // Clear caches
      this.clearCachePattern(`^template_${templateId}`);
      this.clearCachePattern(`^templates_list`);
    });
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(id: string): Promise<OperationResult<any>> {
    const cacheKey = `template_stats_${id}`;

    return this.executeOperation(
      "getTemplateStats",
      async () => {
        const results = await this.db.query(
          `SELECT 
            stats_downloads, 
            stats_rating, 
            stats_reviews,
            created_at,
            updated_at
           FROM ${this.tableName} 
           WHERE id = ?`,
          [id]
        );

        if (results.length === 0) {
          return null;
        }

        return {
          downloads: results[0].stats_downloads,
          rating: results[0].stats_rating,
          reviews: results[0].stats_reviews,
          createdAt: results[0].created_at,
          updatedAt: results[0].updated_at,
        };
      },
      cacheKey
    );
  }
}

/**
 * Create template service
 */
export function createTemplateService(
  ctx: ServiceContext,
  eventBus?: EventBus
): TemplateService {
  return new TemplateService(ctx, eventBus);
}
