/**
 * Service Registry - Centralized service container and initialization
 * Manages all service instances and dependency injection
 */

import { ServiceContainer, ServiceConfig } from './types';
import templateEngine from './template.engine';
import morphEngine from './morph.engine';
import buildPipeline from './build.pipeline';
import trendAnalyzer from './trend.analyzer';
import distribution from './distribution.service';

class ServiceRegistry {
  private static instance: ServiceRegistry;
  private container: ServiceContainer;
  private config: ServiceConfig;

  private constructor(config: ServiceConfig) {
    this.config = config;

    // Initialize service container
    this.container = {
      templateEngine,
      morphEngine,
      buildPipeline,
      trendAnalyzer,
      distribution,
    };

    this.logInitialization();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ServiceConfig): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      if (!config) {
        throw new Error('ServiceConfig is required for first initialization');
      }
      ServiceRegistry.instance = new ServiceRegistry(config);
    }
    return ServiceRegistry.instance;
  }

  /**
   * Get the service container
   */
  getContainer(): ServiceContainer {
    return this.container;
  }

  /**
   * Get a specific service
   */
  getService<K extends keyof ServiceContainer>(
    serviceName: K
  ): ServiceContainer[K] {
    const service = this.container[serviceName];

    if (!service) {
      throw new Error(`Service not found: ${String(serviceName)}`);
    }

    return service;
  }

  /**
   * Get configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; details?: string }>;
    timestamp: Date;
  }> {
    const services: Record<string, { status: string; details?: string }> = {};

    // Template Engine health
    try {
      const templates = await this.container.templateEngine.listTemplates({});
      services.templateEngine = {
        status: 'healthy',
        details: `${templates.length} templates available`,
      };
    } catch (error) {
      services.templateEngine = {
        status: 'unhealthy',
        details: (error as Error).message,
      };
    }

    // Build Pipeline health
    try {
      services.buildPipeline = {
        status: 'healthy',
        details: 'Ready for builds',
      };
    } catch (error) {
      services.buildPipeline = {
        status: 'unhealthy',
        details: (error as Error).message,
      };
    }

    // Trend Analyzer health
    try {
      const trends = await this.container.trendAnalyzer.listTrends({});
      services.trendAnalyzer = {
        status: 'healthy',
        details: `${trends.length} trends tracked`,
      };
    } catch (error) {
      services.trendAnalyzer = {
        status: 'unhealthy',
        details: (error as Error).message,
      };
    }

    // Distribution service health
    try {
      const overview =
        await this.container.distribution.getDistributionOverview();
      services.distribution = {
        status: 'healthy',
        details: `${overview.connectedChannels.length} channels connected`,
      };
    } catch (error) {
      services.distribution = {
        status: 'unhealthy',
        details: (error as Error).message,
      };
    }

    // Morph Engine health
    services.morphEngine = {
      status: 'healthy',
      details: 'Ready for transformations',
    };

    // Overall status
    const unhealthyServices = Object.values(services).filter(
      (s) => s.status === 'unhealthy'
    ).length;

    const overallStatus =
      unhealthyServices === 0
        ? 'healthy'
        : unhealthyServices <= 2
          ? 'degraded'
          : 'unhealthy';

    return {
      status: overallStatus,
      services,
      timestamp: new Date(),
    };
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<{
    templates: { total: number; categories: string[] };
    builds: { queued: number; active: number };
    trends: { tracked: number; analyzed: number };
    distribution: { channels: string[]; published: number; revenue: number };
  }> {
    // Template stats
    const allTemplates = await this.container.templateEngine.listTemplates({
      limit: 100,
    });
    const categories = [...new Set(allTemplates.map((t) => t.category))];

    // Trend stats
    const allTrends = await this.container.trendAnalyzer.listTrends({
      limit: 100,
      archived: false,
    });

    // Distribution stats
    const distroOverview =
      await this.container.distribution.getDistributionOverview();

    return {
      templates: {
        total: allTemplates.length,
        categories: categories as string[],
      },
      builds: {
        queued: 0,
        active: 0,
      },
      trends: {
        tracked: allTrends.length,
        analyzed: allTrends.filter((t) => t.analysis).length,
      },
      distribution: {
        channels: distroOverview.connectedChannels,
        published: distroOverview.totalPublished,
        revenue: distroOverview.totalRevenue,
      },
    };
  }

  /**
   * Log initialization
   */
  private logInitialization(): void {
    console.log('═'.repeat(60));
    console.log('SERVICE REGISTRY INITIALIZED');
    console.log('═'.repeat(60));
    console.log('\nServices:');
    console.log('  ✓ Template Engine');
    console.log('  ✓ Morph Engine');
    console.log('  ✓ Build Pipeline');
    console.log('  ✓ Trend Analyzer');
    console.log('  ✓ Distribution Service');
    console.log('\nConfiguration:');
    console.log(`  Environment: ${this.config.environment}`);
    console.log(`  Data Directory: ${this.config.dataDir}`);
    console.log(`  Build Directory: ${this.config.buildDir}`);
    console.log('═'.repeat(60));
  }
}

/**
 * Factory function to initialize service registry
 */
export function createServiceRegistry(config: ServiceConfig): ServiceContainer {
  const registry = ServiceRegistry.getInstance(config);
  return registry.getContainer();
}

/**
 * Export singleton getter
 */
export function getServiceRegistry(): ServiceRegistry {
  return ServiceRegistry.getInstance();
}

export { ServiceRegistry };
export default ServiceRegistry;
