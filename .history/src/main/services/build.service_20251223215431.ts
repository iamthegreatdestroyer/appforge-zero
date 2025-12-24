/**
 * Build Service
 *
 * Business logic for app builds:
 * - APK compilation via Gradle
 * - Code signing
 * - Distribution to app stores
 * - Build history and tracking
 */

import { BaseService, ServiceContext, OperationResult } from './base.service';
import { EventBus, EventPublisher } from './event-bus';
import { ApiClient } from '../apis';

/**
 * Build record
 */
export interface Build {
  id: string;
  templateId: string;
  status: 'queued' | 'building' | 'signing' | 'distributing' | 'completed' | 'failed';
  version: string;
  versionCode: number;
  platforms: Array<'apk' | 'aab' | 'web'>;
  artifacts: {
    apk?: string; // Path to APK
    aab?: string; // Android App Bundle
    web?: string; // Web build
    changelog?: string;
  };
  signedBy?: string;
  distributedTo: string[]; // Play Store, Itch.io, etc.
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  logs?: string;
}

/**
 * Build service
 */
export class BuildService extends BaseService {
  private eventPublisher: EventPublisher;
  private tableName = 'builds';

  constructor(ctx: ServiceContext, eventBus?: EventBus) {
    super(ctx);
    this.eventPublisher = new EventPublisher(eventBus || new EventBus());
  }

  /**
   * Create build
   */
  async createBuild(
    templateId: string,
    version: string,
    platforms: string[] = ['apk']
  ): Promise<OperationResult<Build>> {
    return this.executeOperation('createBuild', async () => {
      // Get next version code
      const lastBuild = await this.db.query(
        `SELECT version_code FROM ${this.tableName} 
         WHERE template_id = ? 
         ORDER BY version_code DESC 
         LIMIT 1`,
        [templateId]
      );

      const versionCode = (lastBuild[0]?.version_code || 0) + 1;

      const build: Build = {
        id: `bld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId,
        status: 'queued',
        version,
        versionCode,
        platforms: platforms as any,
        artifacts: {},
        distributedTo: [],
        createdAt: new Date(),
      };

      // Store in database
      await this.db.execute(
        `INSERT INTO ${this.tableName} (id, template_id, status, version, version_code, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          build.id,
          build.templateId,
          build.status,
          build.version,
          build.versionCode,
          JSON.stringify(build),
          build.createdAt,
        ]
      );

      // Publish event
      await this.eventPublisher.publish('build.started', 'build-service', {
        buildId: build.id,
        templateId,
        version,
        platforms,
      });

      return build;
    });
  }

  /**
   * Start build compilation
   */
  async startBuild(buildId: string): Promise<OperationResult<Build>> {
    return this.executeOperation('startBuild', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [buildId]
      );

      if (results.length === 0) {
        throw new Error(`Build not found: ${buildId}`);
      }

      const build: Build = JSON.parse(results[0].data);

      if (build.status !== 'queued') {
        throw new Error(`Cannot start build with status: ${build.status}`);
      }

      // Update status
      const buildingStatus: Build = {
        ...build,
        status: 'building',
      };

      await this.db.execute(
        `UPDATE ${this.tableName} SET status = ?, data = ? WHERE id = ?`,
        ['building', JSON.stringify(buildingStatus), buildId]
      );

      // Trigger actual build via API
      try {
        if (this.api) {
          const buildResult = await this.api.buildApk({
            templateId: build.templateId,
            version: build.version,
            versionCode: build.versionCode,
          });

          const completedBuild: Build = {
            ...build,
            status: 'completed',
            artifacts: {
              apk: buildResult.apkPath,
              aab: buildResult.aabPath,
            },
            completedAt: new Date(),
            duration: Date.now() - build.createdAt.getTime(),
          };

          await this.db.execute(
            `UPDATE ${this.tableName} SET status = ?, completed_at = ?, duration = ?, data = ? WHERE id = ?`,
            [
              completedBuild.status,
              completedBuild.completedAt,
              completedBuild.duration,
              JSON.stringify(completedBuild),
              buildId,
            ]
          );

          // Publish completed event
          await this.eventPublisher.publish('build.completed', 'build-service', {
            buildId,
            artifacts: completedBuild.artifacts,
            duration: completedBuild.duration,
          });

          return completedBuild;
        }

        throw new Error('API client not configured');
      } catch (error) {
        const failedBuild: Build = {
          ...build,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          duration: Date.now() - build.createdAt.getTime(),
        };

        await this.db.execute(
          `UPDATE ${this.tableName} SET status = ?, error = ?, completed_at = ?, duration = ?, data = ? WHERE id = ?`,
          [
            failedBuild.status,
            failedBuild.error,
            failedBuild.completedAt,
            failedBuild.duration,
            JSON.stringify(failedBuild),
            buildId,
          ]
        );

        // Publish failed event
        await this.eventPublisher.publish('build.failed', 'build-service', {
          buildId,
          error: failedBuild.error,
        });

        throw error;
      }
    });
  }

  /**
   * Sign build
   */
  async signBuild(buildId: string, signingKey: string): Promise<OperationResult<Build>> {
    return this.executeOperation('signBuild', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [buildId]
      );

      if (results.length === 0) {
        throw new Error(`Build not found: ${buildId}`);
      }

      const build: Build = JSON.parse(results[0].data);

      if (build.status !== 'completed') {
        throw new Error(`Cannot sign build with status: ${build.status}`);
      }

      // Sign via API
      try {
        if (this.api) {
          await this.api.signApk({
            apkPath: build.artifacts.apk,
            signingKey,
          });
        }

        const signedBuild: Build = {
          ...build,
          status: 'distributing',
          signedBy: signingKey,
        };

        await this.db.execute(
          `UPDATE ${this.tableName} SET status = ?, signed_by = ?, data = ? WHERE id = ?`,
          ['distributing', signingKey, JSON.stringify(signedBuild), buildId]
        );

        return signedBuild;
      } catch (error) {
        this.logger.error('Signing failed', error);
        throw error;
      }
    });
  }

  /**
   * Deploy build to store
   */
  async deployBuild(buildId: string, destination: string): Promise<OperationResult<Build>> {
    return this.executeOperation('deployBuild', async () => {
      const results = await this.db.query(
        `SELECT data FROM ${this.tableName} WHERE id = ?`,
        [buildId]
      );

      if (results.length === 0) {
        throw new Error(`Build not found: ${buildId}`);
      }

      const build: Build = JSON.parse(results[0].data);

      // Deploy via API
      try {
        if (this.api) {
          await this.api.deployApk({
            destination,
            aabPath: build.artifacts.aab,
            version: build.version,
            templateId: build.templateId,
          });
        }

        // Update deployment list
        const deployedBuild: Build = {
          ...build,
          distributedTo: [...build.distributedTo, destination],
        };

        // If deployed to all platforms, mark as completed
        if (build.platforms.length === build.distributedTo.length + 1) {
          deployedBuild.status = 'completed';
          deployedBuild.completedAt = new Date();
          deployedBuild.duration = Date.now() - build.createdAt.getTime();

          await this.eventPublisher.publish('build.deployed', 'build-service', {
            buildId,
            destination,
            allDeployed: true,
          });
        }

        await this.db.execute(
          `UPDATE ${this.tableName} SET distributed_to = ?, status = ?, completed_at = ?, data = ? WHERE id = ?`,
          [
            JSON.stringify(deployedBuild.distributedTo),
            deployedBuild.status,
            deployedBuild.completedAt,
            JSON.stringify(deployedBuild),
            buildId,
          ]
        );

        return deployedBuild;
      } catch (error) {
        this.logger.error('Deployment failed', error);
        throw error;
      }
    });
  }

  /**
   * Get build
   */
  async getBuild(buildId: string): Promise<OperationResult<Build | null>> {
    return this.executeOperation(
      'getBuild',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName} WHERE id = ?`,
          [buildId]
        );

        if (results.length === 0) {
          return null;
        }

        return JSON.parse(results[0].data) as Build;
      },
      `build_${buildId}`
    );
  }

  /**
   * Get builds for template
   */
  async getTemplateBuilds(templateId: string, limit: number = 50): Promise<OperationResult<Build[]>> {
    return this.executeOperation(
      'getTemplateBuilds',
      async () => {
        const results = await this.db.query(
          `SELECT data FROM ${this.tableName}
           WHERE template_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
          [templateId, limit]
        );

        return results.map((r) => JSON.parse(r.data) as Build);
      },
      `template_builds_${templateId}`
    );
  }

  /**
   * Get build statistics
   */
  async getBuildStatistics(templateId: string): Promise<OperationResult<any>> {
    return this.executeOperation('getBuildStatistics', async () => {
      const results = await this.db.query(
        `SELECT 
          COUNT(*) as total_builds,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_builds,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_builds,
          AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as avg_duration
         FROM ${this.tableName}
         WHERE template_id = ?`,
        [templateId]
      );

      if (results.length === 0) {
        return null;
      }

      const stats = results[0];
      return {
        totalBuilds: stats.total_builds || 0,
        successfulBuilds: stats.successful_builds || 0,
        failedBuilds: stats.failed_builds || 0,
        averageDurationMs: Math.round(stats.avg_duration || 0),
        successRate: stats.total_builds > 0 
          ? Math.round((stats.successful_builds / stats.total_builds) * 100)
          : 0,
      };
    });
  }
}

/**
 * Create build service
 */
export function createBuildService(ctx: ServiceContext, eventBus?: EventBus): BuildService {
  return new BuildService(ctx, eventBus);
}
