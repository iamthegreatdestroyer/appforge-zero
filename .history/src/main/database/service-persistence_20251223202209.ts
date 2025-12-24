/**
 * Service Database Integration
 *
 * Adapters to connect services to database persistence layer
 */

import { getDatabaseManager } from "./manager";
import {
  TemplateEngineService,
  MorphEngineService,
  BuildPipelineService,
  TrendAnalyzerService,
  DistributionService,
} from "../services";

/**
 * Template Engine Database Adapter
 */
export class TemplateEnginePersistence {
  /**
   * Save template to database
   */
  static async saveTemplate(template: any): Promise<void> {
    const manager = getDatabaseManager();
    const existing = await manager.templates.findById(template.id);

    if (existing) {
      await manager.templates.update(template.id, template);
    } else {
      await manager.templates.create(template);
    }
  }

  /**
   * Load template from database
   */
  static async loadTemplate(id: string): Promise<any | null> {
    const manager = getDatabaseManager();
    return manager.templates.findById(id);
  }

  /**
   * Load all templates
   */
  static async loadTemplates(category?: string) {
    const manager = getDatabaseManager();

    if (category) {
      return manager.templates.findByCategory(category);
    }

    return manager.templates.findAll();
  }

  /**
   * Search templates
   */
  static async searchTemplates(query: string, category?: string) {
    const manager = getDatabaseManager();
    return manager.templates.search(query, category);
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id: string): Promise<void> {
    const manager = getDatabaseManager();
    await manager.templates.delete(id);
  }

  /**
   * Update template stats
   */
  static async updateTemplateStats(id: string, stats: any): Promise<void> {
    const manager = getDatabaseManager();
    await manager.templates.updateStats(id, stats);
  }

  /**
   * Count templates
   */
  static async countTemplates(category?: string): Promise<number> {
    const manager = getDatabaseManager();
    if (category) {
      return manager.templates.count({ category });
    }
    return manager.templates.count();
  }
}

/**
 * Build Pipeline Database Adapter
 */
export class BuildPipelinePersistence {
  /**
   * Save build job
   */
  static async saveBuildJob(job: any): Promise<void> {
    const manager = getDatabaseManager();
    const existing = await manager.buildJobs.findById(job.id);

    if (existing) {
      await manager.buildJobs.update(job.id, job);
    } else {
      await manager.buildJobs.create(job);
    }
  }

  /**
   * Load build job
   */
  static async loadBuildJob(id: string): Promise<any | null> {
    const manager = getDatabaseManager();
    return manager.buildJobs.findById(id);
  }

  /**
   * Get builds for app
   */
  static async getBuildsForApp(appId: string) {
    const manager = getDatabaseManager();
    return manager.buildJobs.findByApp(appId);
  }

  /**
   * Get builds by status
   */
  static async getBuildsByStatus(status: string) {
    const manager = getDatabaseManager();
    return manager.buildJobs.findByStatus(status);
  }

  /**
   * Update build progress
   */
  static async updateBuildProgress(
    id: string,
    progress: number
  ): Promise<void> {
    const manager = getDatabaseManager();
    await manager.buildJobs.updateProgress(id, progress);
  }

  /**
   * Complete build
   */
  static async completeBuild(id: string, artifacts: any[]): Promise<void> {
    const manager = getDatabaseManager();
    await manager.buildJobs.completeBuild(id, artifacts);
  }

  /**
   * Delete build
   */
  static async deleteBuild(id: string): Promise<void> {
    const manager = getDatabaseManager();
    await manager.buildJobs.delete(id);
  }
}

/**
 * Trend Analyzer Database Adapter
 */
export class TrendAnalyzerPersistence {
  /**
   * Save trend
   */
  static async saveTrend(trend: any): Promise<void> {
    const manager = getDatabaseManager();
    const existing = await manager.trends.findById(trend.id);

    if (existing) {
      await manager.trends.update(trend.id, trend);
    } else {
      await manager.trends.create(trend);
    }
  }

  /**
   * Load trend
   */
  static async loadTrend(id: string): Promise<any | null> {
    const manager = getDatabaseManager();
    return manager.trends.findById(id);
  }

  /**
   * Get active trends
   */
  static async getActiveTrends(category?: string) {
    const manager = getDatabaseManager();
    return manager.trends.findActive(category);
  }

  /**
   * Get trends by category
   */
  static async getTrendsByCategory(category: string) {
    const manager = getDatabaseManager();
    return manager.trends.findByCategory(category);
  }

  /**
   * Archive trend
   */
  static async archiveTrend(id: string): Promise<void> {
    const manager = getDatabaseManager();
    await manager.trends.archive(id);
  }

  /**
   * Delete trend
   */
  static async deleteTrend(id: string): Promise<void> {
    const manager = getDatabaseManager();
    await manager.trends.delete(id);
  }
}

/**
 * Distribution Service Database Adapter
 */
export class DistributionPersistence {
  /**
   * Save published app
   */
  static async savePublishedApp(app: any): Promise<void> {
    const manager = getDatabaseManager();
    const existing = await manager.publishedApps.findById(app.id);

    if (existing) {
      await manager.publishedApps.update(app.id, app);
    } else {
      await manager.publishedApps.create(app);
    }
  }

  /**
   * Get published apps for app ID
   */
  static async getPublishedApps(appId: string) {
    const manager = getDatabaseManager();
    return manager.publishedApps.findByApp(appId);
  }

  /**
   * Get apps by channel
   */
  static async getAppsByChannel(channel: string) {
    const manager = getDatabaseManager();
    return manager.publishedApps.findByChannel(channel);
  }

  /**
   * Save sales metrics
   */
  static async saveSalesMetrics(metrics: any): Promise<void> {
    const manager = getDatabaseManager();
    const existing = await manager.salesMetrics.findById(metrics.id);

    if (existing) {
      await manager.salesMetrics.update(metrics.id, metrics);
    } else {
      await manager.salesMetrics.create(metrics);
    }
  }

  /**
   * Get sales metrics for app
   */
  static async getSalesMetrics(appId: string, startDate: Date, endDate: Date) {
    const manager = getDatabaseManager();
    return manager.salesMetrics.getMetricsForApp(appId, startDate, endDate);
  }

  /**
   * Get total revenue
   */
  static async getTotalRevenue(appId: string): Promise<number> {
    const manager = getDatabaseManager();
    return manager.salesMetrics.getTotalRevenue(appId);
  }
}

/**
 * Enhanced Template Engine Service with persistence
 */
export class TemplateEngineWithPersistence extends TemplateEngineService {
  override async createTemplate(template: any): Promise<any> {
    const created = await super.createTemplate(template);
    await TemplateEnginePersistence.saveTemplate(created);
    return created;
  }

  override async getTemplate(id: string): Promise<any | null> {
    const fromDb = await TemplateEnginePersistence.loadTemplate(id);
    if (fromDb) return fromDb;
    return null;
  }

  override async searchTemplates(query: string, category?: string) {
    return TemplateEnginePersistence.searchTemplates(query, category);
  }

  override async deleteTemplate(id: string): Promise<boolean> {
    const result = await super.deleteTemplate(id);
    if (result) {
      await TemplateEnginePersistence.deleteTemplate(id);
    }
    return result;
  }

  override async rateTemplate(id: string, rating: number): Promise<void> {
    await super.rateTemplate(id, rating);
    const template = this.templates.get(id);
    if (template) {
      await TemplateEnginePersistence.updateTemplateStats(id, template.stats);
    }
  }
}

/**
 * Enhanced Build Pipeline Service with persistence
 */
export class BuildPipelineWithPersistence extends BuildPipelineService {
  override async createBuildJob(appId: string, config: any): Promise<string> {
    const jobId = await super.createBuildJob(appId, config);
    const job = this.jobs.get(jobId);
    if (job) {
      await BuildPipelinePersistence.saveBuildJob(job);
    }
    return jobId;
  }

  override async getBuildJob(id: string): Promise<any | null> {
    const fromDb = await BuildPipelinePersistence.loadBuildJob(id);
    if (fromDb) return fromDb;
    return this.jobs.get(id) || null;
  }

  override async updateProgress(
    jobId: string,
    progress: number
  ): Promise<void> {
    await super.updateProgress(jobId, progress);
    await BuildPipelinePersistence.updateBuildProgress(jobId, progress);
  }

  override async completeBuild(jobId: string, artifacts: any[]): Promise<void> {
    await super.completeBuild(jobId, artifacts);
    await BuildPipelinePersistence.completeBuild(jobId, artifacts);
  }
}

/**
 * Enhanced Trend Analyzer Service with persistence
 */
export class TrendAnalyzerWithPersistence extends TrendAnalyzerService {
  override async analyzeTrends(category?: string) {
    const trends = await super.analyzeTrends(category);

    for (const trend of trends) {
      await TrendAnalyzerPersistence.saveTrend(trend);
    }

    return trends;
  }

  override async getActiveTrends(category?: string) {
    return TrendAnalyzerPersistence.getActiveTrends(category);
  }

  override async archiveTrend(id: string): Promise<void> {
    await super.archiveTrend(id);
    await TrendAnalyzerPersistence.archiveTrend(id);
  }
}

/**
 * Enhanced Distribution Service with persistence
 */
export class DistributionWithPersistence extends DistributionService {
  override async publishApp(
    appId: string,
    channel: string,
    config: any
  ): Promise<boolean> {
    const result = await super.publishApp(appId, channel, config);
    if (result) {
      const app = {
        id: `${appId}-${channel}`,
        appId,
        channel,
        name: config.name,
        version: config.version,
        status: "published",
      };
      await DistributionPersistence.savePublishedApp(app);
    }
    return result;
  }

  override async getPublishedApps(appId: string) {
    return DistributionPersistence.getPublishedApps(appId);
  }

  override async recordSales(
    appId: string,
    channel: string,
    metrics: any
  ): Promise<void> {
    await super.recordSales(appId, channel, metrics);
    const metric = {
      id: `${appId}-${channel}-${new Date().toISOString()}`,
      appId,
      channel,
      date: new Date(),
      ...metrics,
    };
    await DistributionPersistence.saveSalesMetrics(metric);
  }
}
