/**
 * Database Usage Guide
 *
 * Examples and best practices for using the database layer
 */

import {
  getDatabaseManager,
  DatabaseType,
  TemplateEnginePersistence,
  BuildPipelinePersistence,
  TrendAnalyzerPersistence,
  DistributionPersistence,
} from '../database';

/**
 * ============================================================
 * 1. DATABASE INITIALIZATION
 * ============================================================
 */

export async function initializeDatabase() {
  const manager = getDatabaseManager();

  // Initialize SQLite database
  await manager.initialize({
    type: DatabaseType.SQLITE,
    path: './appforge.db', // or :memory: for testing
    database: 'appforge',
    logging: false,
    migrations: [
      '001_initial_schema',
      '002_add_indexes',
    ],
  });

  console.log('Database initialized');
  return manager;
}

/**
 * ============================================================
 * 2. TEMPLATE OPERATIONS
 * ============================================================
 */

export async function templateExamples() {
  const manager = getDatabaseManager();

  // Create template
  const template = await manager.templates.create({
    id: 'tmpl-comedy-1',
    title: 'I Love Lucy Retelling',
    description: 'Classic I Love Lucy adapted for space',
    category: 'comedy',
    version: '1.0.0',
    author: 'AppForge',
    morphTransformation: {
      settingTransform: { location: 'Luna Prime Station', year: 2157 },
      characterRules: [
        { original: 'Lucy Ricardo', transform: 'Luna Ricardo' },
      ],
    },
    stats: { downloads: 0, rating: 0, reviews: 0 },
  });

  // Find all templates
  const all = await manager.templates.findAll({ limit: 10 });

  // Find by category
  const comedy = await manager.templates.findByCategory('comedy');

  // Search templates
  const search = await manager.templates.search('funny', 'comedy');

  // Get specific template
  const found = await manager.templates.findById('tmpl-comedy-1');

  // Update template
  if (found) {
    await manager.templates.update('tmpl-comedy-1', {
      title: 'Updated: I Love Lucy Retelling',
    });
  }

  // Update statistics
  await manager.templates.updateStats('tmpl-comedy-1', {
    downloads: 42,
    rating: 4.5,
    reviews: 8,
  });

  // Delete template
  await manager.templates.delete('tmpl-comedy-1');

  // Count templates
  const count = await manager.templates.count({ category: 'comedy' });
  console.log(`Total comedy templates: ${count}`);
}

/**
 * ============================================================
 * 3. BUILD JOB OPERATIONS
 * ============================================================
 */

export async function buildJobExamples() {
  const manager = getDatabaseManager();

  // Create build job
  const job = await manager.buildJobs.create({
    id: 'build-abc123',
    appId: 'app-001',
    status: 'queued',
    progress: 0,
    configuration: {
      appName: 'Luna',
      packageName: 'com.appforge.luna',
      versionCode: 1,
      versionName: '1.0.0',
      outputPath: '/builds/app-001/',
    },
    artifacts: [],
    logs: [],
  });

  // Get builds for app
  const appBuilds = await manager.buildJobs.findByApp('app-001');

  // Find builds by status
  const building = await manager.buildJobs.findByStatus('building');

  // Update progress
  await manager.buildJobs.updateProgress('build-abc123', 25);
  console.log('Build 25% complete');

  await manager.buildJobs.updateProgress('build-abc123', 50);
  console.log('Build 50% complete');

  // Complete build with artifacts
  await manager.buildJobs.completeBuild('build-abc123', [
    {
      type: 'apk',
      path: '/artifacts/Luna-1.0.0.apk',
      size: 45000000,
      checksum: 'sha256:abc123...',
    },
  ]);

  // Delete completed build
  await manager.buildJobs.delete('build-abc123');
}

/**
 * ============================================================
 * 4. TREND OPERATIONS
 * ============================================================
 */

export async function trendExamples() {
  const manager = getDatabaseManager();

  // Create trend
  const trend = await manager.trends.create({
    id: 'trend-001',
    keyword: 'AI-powered animation',
    category: 'entertainment',
    source: 'combined',
    metrics: {
      volume: 15000,
      growth: 35.2,
      momentum: 'rising',
      sources: ['twitter', 'tiktok', 'reddit'],
    },
    analysis: {
      sentiment: 'positive',
      relevance: 0.92,
      appPotential: 0.88,
      suggestedTemplate: 'sci-fi',
    },
  });

  // Get active trends
  const active = await manager.trends.findActive();
  console.log(`Active trends: ${active.length}`);

  // Get trends by category
  const entertainment = await manager.trends.findByCategory('entertainment');

  // Archive trend when no longer relevant
  await manager.trends.archive('trend-001');

  // View archived trends
  const archived = await manager.trends.findWhere({ archived: 1 });
}

/**
 * ============================================================
 * 5. PUBLISHED APPS OPERATIONS
 * ============================================================
 */

export async function publishedAppExamples() {
  const manager = getDatabaseManager();

  // Publish app to Gumroad
  const published = await manager.publishedApps.create({
    id: 'pub-gumroad-001',
    appId: 'app-001',
    channel: 'gumroad',
    name: 'Luna - Space Comedy',
    version: '1.0.0',
    status: 'published',
    url: 'https://gumroad.com/products/luna',
    revenue: 0,
    downloads: 0,
    publishDate: new Date(),
  });

  // Get all published versions of an app
  const versions = await manager.publishedApps.findByApp('app-001');
  console.log(`App versions: ${versions.length}`);

  // Get all apps on a channel
  const gumroadApps = await manager.publishedApps.findByChannel('gumroad');

  // Update after sales
  await manager.publishedApps.update('pub-gumroad-001', {
    downloads: 250,
    revenue: 1250.50,
  });
}

/**
 * ============================================================
 * 6. SALES METRICS OPERATIONS
 * ============================================================
 */

export async function salesMetricsExamples() {
  const manager = getDatabaseManager();

  // Record daily sales
  const today = new Date();
  const metric = await manager.salesMetrics.create({
    id: `metric-${today.getTime()}`,
    appId: 'app-001',
    channel: 'gumroad',
    date: today,
    revenue: 450.75,
    downloads: 32,
    purchases: 9,
    refunds: 1,
  });

  // Get sales metrics for date range
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7); // Last 7 days

  const weekMetrics = await manager.salesMetrics.getMetricsForApp(
    'app-001',
    startDate,
    today
  );

  // Calculate total revenue
  const totalRevenue = await manager.salesMetrics.getTotalRevenue('app-001');
  console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);

  // Calculate weekly stats
  let totalDownloads = 0;
  for (const m of weekMetrics) {
    totalDownloads += m.downloads;
  }
  console.log(`Weekly downloads: ${totalDownloads}`);
}

/**
 * ============================================================
 * 7. QUERY BUILDER EXAMPLES
 * ============================================================
 */

export async function queryBuilderExamples() {
  const manager = getDatabaseManager();
  const db = manager.getDatabase();

  // Complex SELECT query
  const templates = await db
    .select<any>()
    .from('templates')
    .where({ category: 'comedy' })
    .orderBy('createdAt', false)
    .limit(10)
    .execute();

  console.log(`Found ${templates.count} comedy templates`);

  // INSERT query
  await db
    .insert<any>()
    .into('templates')
    .values({
      id: 'tmpl-new',
      title: 'New Template',
      description: 'A brand new template',
      category: 'test',
      version: '1.0.0',
      author: 'system',
      morphTransformation: '{}',
      stats: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  // UPDATE query
  await db
    .update<any>()
    .table('templates')
    .set({ title: 'Updated Template' })
    .where({ id: 'tmpl-new' })
    .execute();

  // DELETE query
  await db
    .delete()
    .from('templates')
    .where({ id: 'tmpl-new' })
    .execute();
}

/**
 * ============================================================
 * 8. TRANSACTION EXAMPLES
 * ============================================================
 */

export async function transactionExamples() {
  const manager = getDatabaseManager();

  // Simple transaction
  await manager.transaction(async () => {
    // All these operations are atomic
    await manager.templates.create({
      id: 'tmpl-tx-1',
      title: 'Transaction Test',
      description: 'Testing transactions',
      category: 'test',
      version: '1.0.0',
      author: 'test',
      morphTransformation: {},
      stats: {},
    });

    // If any error occurs, all changes are rolled back
    const template = await manager.templates.findById('tmpl-tx-1');
    if (template) {
      await manager.templates.update('tmpl-tx-1', {
        title: 'Updated in Transaction',
      });
    }
  });

  // Transaction with error handling
  try {
    await manager.transaction(async () => {
      await manager.buildJobs.create({
        id: 'build-tx-1',
        appId: 'app-001',
        status: 'queued',
        progress: 0,
        configuration: {},
        artifacts: [],
        logs: [],
      });

      // Simulate error
      throw new Error('Something went wrong!');
    });
  } catch (error) {
    console.log('Transaction rolled back due to error');
    // Verify rollback
    const build = await manager.buildJobs.findById('build-tx-1');
    console.log('Build exists:', build !== null); // false
  }
}

/**
 * ============================================================
 * 9. STATISTICS AND MONITORING
 * ============================================================
 */

export async function monitoringExamples() {
  const manager = getDatabaseManager();

  // Get health status
  const health = await manager.healthCheck();
  console.log(`Database status: ${health.status}`);
  console.log(`Message: ${health.message}`);

  // Get statistics
  const stats = manager.getStats();
  console.log(`Queries executed: ${stats.queriesExecuted}`);
  console.log(`Total execution time: ${stats.totalExecutionTime}ms`);
  console.log(`Cache hits: ${stats.cacheHits}`);
  console.log(`Cache misses: ${stats.cacheMisses}`);
  console.log(`Cache hit rate: ${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(2)}%`);

  // Reset statistics
  manager.resetStats();
  console.log('Statistics reset');
}

/**
 * ============================================================
 * 10. SERVICE PERSISTENCE EXAMPLES
 * ============================================================
 */

export async function servicePersistenceExamples() {
  // Template persistence
  const template = {
    id: 'tmpl-persist-1',
    title: 'Persisted Template',
    description: 'This template is saved to database',
    category: 'comedy',
    version: '1.0.0',
    author: 'system',
    morphTransformation: { rules: [] },
    stats: { downloads: 0 },
  };

  await TemplateEnginePersistence.saveTemplate(template);
  const loaded = await TemplateEnginePersistence.loadTemplate('tmpl-persist-1');
  console.log(`Loaded: ${loaded?.title}`);

  // Build persistence
  const job = {
    id: 'build-persist-1',
    appId: 'app-001',
    status: 'building',
    progress: 0,
    configuration: {},
    artifacts: [],
    logs: [],
  };

  await BuildPipelinePersistence.saveBuildJob(job);
  await BuildPipelinePersistence.updateBuildProgress('build-persist-1', 50);

  // Trend persistence
  const trend = {
    id: 'trend-persist-1',
    keyword: 'AI trends',
    category: 'tech',
    source: 'combined',
    metrics: { volume: 10000 },
    analysis: { relevance: 0.9 },
  };

  await TrendAnalyzerPersistence.saveTrend(trend);
  const active = await TrendAnalyzerPersistence.getActiveTrends();

  // Distribution persistence
  const app = {
    id: 'pub-persist-1',
    appId: 'app-001',
    channel: 'gumroad',
    name: 'Test App',
    version: '1.0.0',
    status: 'published',
    revenue: 100,
    downloads: 10,
  };

  await DistributionPersistence.savePublishedApp(app);
  const published = await DistributionPersistence.getPublishedApps('app-001');
}

/**
 * ============================================================
 * 11. CLEANUP
 * ============================================================
 */

export async function closeDatabase() {
  const manager = getDatabaseManager();
  await manager.close();
  console.log('Database connection closed');
}

/**
 * ============================================================
 * 12. COMPLETE EXAMPLE FLOW
 * ============================================================
 */

export async function completeExampleFlow() {
  // Initialize
  const manager = await initializeDatabase();

  // Create template
  console.log('Creating template...');
  const template = await manager.templates.create({
    id: 'tmpl-example-1',
    title: 'Example Template',
    description: 'A complete example',
    category: 'comedy',
    version: '1.0.0',
    author: 'AppForge',
    morphTransformation: {},
    stats: {},
  });

  // Create build job
  console.log('Creating build job...');
  const job = await manager.buildJobs.create({
    id: 'build-example-1',
    appId: 'app-example-1',
    status: 'building',
    progress: 0,
    configuration: {},
    artifacts: [],
    logs: [],
  });

  // Update progress through transaction
  console.log('Updating progress with transaction...');
  await manager.transaction(async () => {
    await manager.buildJobs.updateProgress('build-example-1', 50);
    await manager.buildJobs.updateProgress('build-example-1', 100);
  });

  // Complete build
  console.log('Completing build...');
  await manager.buildJobs.completeBuild('build-example-1', [
    { type: 'apk', path: '/artifacts/app.apk' },
  ]);

  // Publish app
  console.log('Publishing app...');
  await manager.publishedApps.create({
    id: 'pub-example-1',
    appId: 'app-example-1',
    channel: 'gumroad',
    name: 'Example App',
    version: '1.0.0',
    status: 'published',
    url: 'https://gumroad.com/products/example',
    revenue: 0,
    downloads: 0,
    publishDate: new Date(),
  });

  // Get statistics
  console.log('Database statistics:');
  const stats = manager.getStats();
  console.log(`  Queries: ${stats.queriesExecuted}`);
  console.log(`  Execution time: ${stats.totalExecutionTime}ms`);
  console.log(`  Cache hits: ${stats.cacheHits}`);

  // Cleanup
  await closeDatabase();
}
