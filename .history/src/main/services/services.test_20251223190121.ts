/**
 * Service Tests - Comprehensive test suite for all services
 * Tests Template Engine, Morph Engine, Build Pipeline, Trend Analyzer, Distribution
 */

import templateEngine from '../template.engine';
import morphEngine from '../morph.engine';
import buildPipeline from '../build.pipeline';
import trendAnalyzer from '../trend.analyzer';
import distribution from '../distribution.service';

describe('Phase 3: Service Layer Tests', () => {
  describe('Template Engine', () => {
    it('should load a template by ID', async () => {
      const template = await templateEngine.loadTemplate('template-1');
      expect(template).toBeDefined();
      expect(template.id).toBe('template-1');
      expect(template.title).toBe('Space Colony Lucy');
    });

    it('should list templates with filtering', async () => {
      const templates = await templateEngine.listTemplates({
        category: 'SciFi',
        limit: 10,
      });
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.category === 'SciFi')).toBe(true);
    });

    it('should list templates with search query', async () => {
      const templates = await templateEngine.listTemplates({
        searchQuery: 'Space',
        limit: 10,
      });
      expect(templates.length).toBeGreaterThan(0);
      expect(
        templates.some((t) =>
          t.title.toLowerCase().includes('space')
        )
      ).toBe(true);
    });

    it('should sort templates by rating', async () => {
      const templates = await templateEngine.listTemplates({
        sortBy: 'rating',
        limit: 10,
      });
      expect(templates.length).toBeGreaterThan(0);
      // Verify sorting
      for (let i = 1; i < templates.length; i++) {
        expect(templates[i].stats.rating).toBeLessThanOrEqual(
          templates[i - 1].stats.rating
        );
      }
    });

    it('should validate a valid template', async () => {
      const validation = await templateEngine.validateTemplate({
        title: 'Valid Template',
        description: 'A valid template description',
        category: 'Test',
        morphTransformation: {
          characters: {
            test: {
              originalName: 'Original',
              newName: 'Transformed',
              traits: ['trait1'],
              personality: {},
            },
          },
          settings: {
            test: {
              originalSetting: 'Old',
              newSetting: 'New',
              characteristics: ['char1'],
            },
          },
          narrative: {},
        },
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject template without title', async () => {
      const validation = await templateEngine.validateTemplate({
        title: '',
        description: 'Description',
        category: 'Test',
        morphTransformation: {
          characters: {},
          settings: {},
          narrative: {},
        },
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.field === 'title')).toBe(true);
    });

    it('should get template statistics', async () => {
      const stats = await templateEngine.getTemplateStats('template-1');
      expect(stats).toBeDefined();
      expect(stats.downloads).toBeGreaterThanOrEqual(0);
      expect(stats.rating).toBeGreaterThanOrEqual(0);
      expect(stats.rating).toBeLessThanOrEqual(5);
      expect(stats.reviews).toBeGreaterThanOrEqual(0);
    });

    it('should update template rating', async () => {
      const initialStats = await templateEngine.getTemplateStats('template-1');
      const initialReviews = initialStats.reviews;

      await templateEngine.updateRating('template-1', 5);

      const updatedStats = await templateEngine.getTemplateStats('template-1');
      expect(updatedStats.reviews).toBe(initialReviews + 1);
    });

    it('should save a new template', async () => {
      const newTemplate = {
        id: '',
        title: 'New Template',
        description: 'Test Template',
        category: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        metadata: { tags: [] },
        morphTransformation: {
          characters: {
            test: {
              originalName: 'Original',
              newName: 'New',
              traits: [],
              personality: {},
            },
          },
          settings: {
            test: {
              originalSetting: 'Old Setting',
              newSetting: 'New Setting',
              characteristics: [],
            },
          },
          narrative: {},
        },
        stats: { downloads: 0, rating: 0, reviews: 0 },
      };

      const id = await templateEngine.saveTemplate(newTemplate);
      expect(id).toBeDefined();
      expect(id.startsWith('template-')).toBe(true);
    });

    it('should delete a template', async () => {
      // Create a template first
      const newTemplate = {
        id: `test-delete-${Date.now()}`,
        title: 'Delete Test',
        description: 'Template to delete',
        category: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        metadata: { tags: [] },
        morphTransformation: {
          characters: {
            test: {
              originalName: 'Original',
              newName: 'New',
              traits: [],
              personality: {},
            },
          },
          settings: {
            test: {
              originalSetting: 'Old Setting',
              newSetting: 'New Setting',
              characteristics: [],
            },
          },
          narrative: {},
        },
        stats: { downloads: 0, rating: 0, reviews: 0 },
      };

      await templateEngine.saveTemplate(newTemplate);
      await templateEngine.deleteTemplate(newTemplate.id);

      // Verify deletion
      expect(
        (async () => {
          try {
            await templateEngine.loadTemplate(newTemplate.id);
            return false;
          } catch {
            return true;
          }
        })()
      ).resolves.toBe(true);
    });
  });

  describe('Morph Engine', () => {
    it('should transform characters', async () => {
      const input = {
        originalContent:
          'Lucy is ambitious and schemes constantly. She loves Ricky.',
        morphRules: {
          characters: {
            lucy: {
              originalName: 'Lucy',
              newName: 'Luna',
              traits: ['ambitious'],
              personality: { humor: 'witty' },
              relationships: { ricky: 'commander' },
            },
          },
          settings: {},
          narrative: {},
        },
        context: {
          targetSetting: 'Space Station',
          targetEra: '2157',
          tone: 'adventurous',
        },
      };

      const output = await morphEngine.transformCharacters(input);

      expect(output).toBeDefined();
      expect(output.transformedContent).toBeDefined();
      expect(output.replacements).toBeDefined();
      expect(output.replacements.length).toBeGreaterThan(0);
      expect(output.transformedContent).toContain('Luna');
    });

    it('should transform settings', async () => {
      const input = {
        originalContent: 'The apartment in Manhattan is their home.',
        morphRules: {
          characters: {},
          settings: {
            apt: {
              originalSetting: 'apartment',
              newSetting: 'space station quarters',
              characteristics: ['advanced technology'],
            },
          },
          narrative: {},
        },
        context: {
          targetSetting: 'Space Station',
          targetEra: '2157',
          tone: 'adventurous',
        },
      };

      const output = await morphEngine.transformSetting(input);

      expect(output).toBeDefined();
      expect(output.replacements.length).toBeGreaterThan(0);
      expect(output.transformedContent).toContain('space station quarters');
    });

    it('should transform narrative', async () => {
      const input = {
        originalContent:
          'The main theme is about marital comedy and misunderstandings.',
        morphRules: {
          characters: {},
          settings: {},
          narrative: {
            main: {
              originalTheme: 'marital comedy',
              newTheme: 'space exploration',
              tone: 'adventurous',
              conflicts: ['zero-g mishaps'],
            },
          },
        },
        context: {
          targetSetting: 'Space Station',
          targetEra: '2157',
          tone: 'adventurous',
        },
      };

      const output = await morphEngine.transformNarrative(input);

      expect(output).toBeDefined();
      expect(output.replacements.length).toBeGreaterThan(0);
      expect(output.transformedContent).toContain('space exploration');
    });

    it('should analyze transformation quality', async () => {
      const output = {
        transformedContent: 'Luna is ambitious and adventurous.',
        replacements: [
          {
            original: 'Lucy',
            replacement: 'Luna',
            type: 'character' as const,
            confidence: 0.95,
          },
        ],
        metadata: {
          transformationScore: 0.9,
          preservedElements: ['is', 'and', 'ambitious'],
          alteredElements: ['Lucy→Luna'],
          estimatedQuality: 0.85,
        },
      };

      const analysis = await morphEngine.analyzeTransformation(output);

      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(1);
      expect(analysis.preservationRatio).toBeGreaterThanOrEqual(0);
      expect(analysis.originalityScore).toBeGreaterThanOrEqual(0);
    });

    it('should identify transformation issues', async () => {
      const output = {
        transformedContent: 'Lorem ipsum dolor sit amet',
        replacements: [],
        metadata: {
          transformationScore: 0,
          preservedElements: [],
          alteredElements: [],
          estimatedQuality: 0,
        },
      };

      const analysis = await morphEngine.analyzeTransformation(output);

      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(
        analysis.issues.some(
          (i) =>
            i.type === 'consistency' &&
            i.severity === 'high'
        )
      ).toBe(true);
    });
  });

  describe('Build Pipeline', () => {
    it('should create a build job', async () => {
      const config = {
        appName: 'Test App',
        appVersion: '1.0.0',
        packageName: 'com.example.testapp',
        targetFormat: 'apk' as const,
        releaseMode: 'debug' as const,
        optimization: 'basic' as const,
      };

      const build = await buildPipeline.createBuild('app-1', config);

      expect(build).toBeDefined();
      expect(build.status).toBe('queued');
      expect(build.progress).toBe(0);
      expect(build.configuration).toEqual(config);
    });

    it('should list builds for an app', async () => {
      const builds = await buildPipeline.listBuilds('app-1');

      expect(Array.isArray(builds)).toBe(true);
    });

    it('should get a build job', async () => {
      const config = {
        appName: 'Test App',
        appVersion: '1.0.0',
        packageName: 'com.example.testapp',
        targetFormat: 'apk' as const,
        releaseMode: 'debug' as const,
        optimization: 'basic' as const,
      };

      const created = await buildPipeline.createBuild('app-1', config);
      const retrieved = await buildPipeline.getBuild(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.status).toBe('queued');
    });

    it('should retrieve build statistics', async () => {
      const stats = await buildPipeline.getBuildStats('app-1');

      expect(stats).toBeDefined();
      expect(stats.totalBuilds).toBeGreaterThanOrEqual(0);
      expect(stats.successfulBuilds).toBeGreaterThanOrEqual(0);
      expect(stats.failedBuilds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Trend Analyzer', () => {
    it('should scan for trends', async () => {
      const trends = await trendAnalyzer.scan({
        sources: ['google'],
        limit: 10,
      });

      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]).toHaveProperty('keyword');
      expect(trends[0]).toHaveProperty('metrics');
    });

    it('should list trends', async () => {
      const trends = await trendAnalyzer.listTrends({
        limit: 10,
      });

      expect(Array.isArray(trends)).toBe(true);
    });

    it('should analyze a trend', async () => {
      const trends = await trendAnalyzer.scan({ limit: 1 });
      if (trends.length === 0) return;

      const analysis = await trendAnalyzer.analyzeTrend(trends[0].id);

      expect(analysis).toBeDefined();
      expect(analysis.opportunityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.opportunityScore).toBeLessThanOrEqual(1);
      expect(analysis.competitionLevel).toMatch(/^(low|medium|high)$/);
      expect(analysis.marketSize).toMatch(/^(niche|moderate|large)$/);
      expect(Array.isArray(analysis.insights)).toBe(true);
      expect(Array.isArray(analysis.suggestedApps)).toBe(true);
    });

    it('should generate insights for a trend', async () => {
      const trends = await trendAnalyzer.scan({ limit: 1 });
      if (trends.length === 0) return;

      const insights = await trendAnalyzer.generateInsights(trends[0]);

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.every((i) => i.title && i.description)).toBe(true);
    });

    it('should suggest apps for a trend', async () => {
      const trends = await trendAnalyzer.scan({ limit: 1 });
      if (trends.length === 0) return;

      const suggestions = await trendAnalyzer.suggestApps(trends[0]);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should archive a trend', async () => {
      const trends = await trendAnalyzer.scan({ limit: 1 });
      if (trends.length === 0) return;

      await trendAnalyzer.archiveTrend(trends[0].id);

      const archived = await trendAnalyzer.listTrends({
        archived: true,
        limit: 10,
      });

      expect(archived.some((t) => t.id === trends[0].id)).toBe(true);
    });
  });

  describe('Distribution Service', () => {
    it('should authenticate with a channel', async () => {
      await distribution.authenticateChannel('gumroad', {
        accessToken: 'test-token-123',
      });

      const connected = await distribution.isChannelConnected('gumroad');
      expect(connected).toBe(true);
    });

    it('should check channel connection status', async () => {
      const connected = await distribution.isChannelConnected('gumroad');
      expect(typeof connected).toBe('boolean');
    });

    it('should list published apps', async () => {
      const apps = await distribution.listPublishedApps('gumroad');

      expect(Array.isArray(apps)).toBe(true);
      expect(apps.every((a) => a.id && a.name)).toBe(true);
    });

    it('should get distribution overview', async () => {
      const overview = await distribution.getDistributionOverview();

      expect(overview).toBeDefined();
      expect(Array.isArray(overview.connectedChannels)).toBe(true);
      expect(overview.totalPublished).toBeGreaterThanOrEqual(0);
      expect(overview.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(overview.totalDownloads).toBeGreaterThanOrEqual(0);
    });

    it('should compare channel performance', async () => {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 86400000);

      const comparison = await distribution.compareChannelPerformance({
        startDate: weekAgo,
        endDate: today,
      });

      expect(comparison).toBeDefined();
      expect(typeof comparison === 'object').toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should handle a complete workflow', async () => {
      // 1. Load a template
      const template = await templateEngine.loadTemplate('template-1');
      expect(template).toBeDefined();

      // 2. Create a build
      const build = await buildPipeline.createBuild('workflow-test', {
        appName: template.title,
        appVersion: '1.0.0',
        packageName: 'com.example.workflow',
        targetFormat: 'apk' as const,
        releaseMode: 'release' as const,
        optimization: 'full' as const,
      });

      expect(build).toBeDefined();
      expect(build.status).toBe('queued');

      // 3. Analyze trends
      const trends = await trendAnalyzer.scan({ limit: 5 });
      expect(trends.length).toBeGreaterThan(0);

      // 4. Get overview
      const distroOverview = await distribution.getDistributionOverview();
      expect(distroOverview).toBeDefined();
    });

    it('should handle service failures gracefully', async () => {
      try {
        await templateEngine.loadTemplate('non-existent-template');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });

    it('should validate data consistency across services', async () => {
      const templates = await templateEngine.listTemplates({ limit: 100 });
      const trends = await trendAnalyzer.scan({ limit: 100 });

      // Verify that both services return consistent data structures
      expect(templates.every((t) => t.id && t.title)).toBe(true);
      expect(trends.every((t) => t.id && t.keyword)).toBe(true);
    });
  });
});
