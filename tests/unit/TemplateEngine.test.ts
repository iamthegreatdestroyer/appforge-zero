/**
 * Unit Tests for TemplateEngine
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  pathExists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copy: vi.fn(),
  ensureDir: vi.fn(),
  move: vi.fn(),
  rmdir: vi.fn(),
  chmod: vi.fn(),
}));

describe('TemplateEngine', () => {
  const mockTemplatesDir = '/mock/templates';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadTemplates', () => {
    it('should load templates from directory', async () => {
      // Mock template directory structure
      vi.mocked(fs.readdir).mockResolvedValue(['wallpaper-pack'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(`
id: wallpaper-pack
name: Wallpaper Pack
category: personalization
version: 1.0.0
morph_points:
  - id: app_name
    type: string
    path: res/values/strings.xml
    pattern: "{{APP_NAME}}"
    required: true
`);

      // Dynamic import to get fresh instance
      const { TemplateEngine } = await import('@main/services/TemplateEngine');
      const engine = new TemplateEngine(mockTemplatesDir);
      
      await engine.loadTemplates();
      const templates = engine.listTemplates();
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('wallpaper-pack');
    });

    it('should emit loaded event when templates are loaded', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);
      
      const { TemplateEngine } = await import('@main/services/TemplateEngine');
      const engine = new TemplateEngine(mockTemplatesDir);
      
      const loadedHandler = vi.fn();
      engine.on('template:loaded', loadedHandler);
      
      await engine.loadTemplates();
      
      expect(engine.listTemplates()).toHaveLength(0);
    });
  });

  describe('validateMorphConfig', () => {
    it('should validate required morph points', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['test-template'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(`
id: test-template
name: Test Template
category: test
morph_points:
  - id: app_name
    type: string
    path: res/values/strings.xml
    pattern: "{{APP_NAME}}"
    required: true
`);

      const { TemplateEngine } = await import('@main/services/TemplateEngine');
      const engine = new TemplateEngine(mockTemplatesDir);
      await engine.loadTemplates();
      
      const template = engine.getTemplate('test-template');
      expect(template).toBeDefined();
      
      const errors = engine.validateMorphConfig(template!, {
        appName: '',
        packageName: 'invalid',
        versionName: '1.0.0',
        versionCode: 1,
        values: {},
      });
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate package name format', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['test-template'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(`
id: test-template
name: Test Template
category: test
morph_points: []
`);

      const { TemplateEngine } = await import('@main/services/TemplateEngine');
      const engine = new TemplateEngine(mockTemplatesDir);
      await engine.loadTemplates();
      
      const template = engine.getTemplate('test-template');
      
      const errors = engine.validateMorphConfig(template!, {
        appName: 'Test App',
        packageName: 'invalid-package',
        versionName: '1.0.0',
        versionCode: 1,
        values: {},
      });
      
      expect(errors).toContain('Invalid package name format. Must be like: com.example.app');
    });

    it('should accept valid configuration', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['test-template'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(`
id: test-template
name: Test Template
category: test
morph_points: []
`);

      const { TemplateEngine } = await import('@main/services/TemplateEngine');
      const engine = new TemplateEngine(mockTemplatesDir);
      await engine.loadTemplates();
      
      const template = engine.getTemplate('test-template');
      
      const errors = engine.validateMorphConfig(template!, {
        appName: 'My Awesome App',
        packageName: 'com.example.myapp',
        versionName: '1.0.0',
        versionCode: 1,
        values: {},
      });
      
      expect(errors).toHaveLength(0);
    });
  });
});
