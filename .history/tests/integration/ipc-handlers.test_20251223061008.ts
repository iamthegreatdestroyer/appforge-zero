/**
 * AppForge Zero - IPC Handlers Integration Tests
 * 
 * Tests all IPC handlers with mocked service dependencies.
 * Verifies correct handler registration, response formats, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import type {
  IPCResponse,
  AppProject,
  Template,
  TemplateCategory,
  BuildProgress,
  TrendAnalysis,
  Trend,
} from '../../src/shared/types';

// =============================================================================
// Mock Types
// =============================================================================

interface MockDatabase {
  run: Mock;
  all: Mock<(...args: unknown[]) => Record<string, unknown>[]>;
  get: Mock<(...args: unknown[]) => Record<string, unknown> | undefined>;
}

interface MockTemplateEngine {
  getTemplates: Mock;
  getTemplate: Mock;
  refreshTemplates: Mock;
  validateTemplatePath: Mock;
  morphTemplate: Mock;
}

interface MockBuildPipeline {
  buildApp: Mock;
  cancelBuild: Mock;
  getBuildInfo: Mock;
}

interface MockHandlerContext {
  database: MockDatabase | null;
  templateEngine: MockTemplateEngine | null;
  buildPipeline: MockBuildPipeline | null;
  mainWindow: () => Partial<BrowserWindow> | null;
}

// =============================================================================
// Test Fixtures
// =============================================================================

const mockTemplate: Template = {
  id: 'template-1',
  name: 'Wallpaper Pack',
  description: 'Beautiful wallpaper collection',
  category: 'wallpaper-pack',
  version: '1.0.0',
  author: 'AppForge',
  path: '/templates/wallpaper-pack',
  morphPoints: [
    {
      id: 'app-name',
      type: 'string',
      label: 'App Name',
      path: 'app/build.gradle',
      placeholder: '{{APP_NAME}}',
      required: true,
    },
  ],
  previewImage: '/templates/wallpaper-pack/preview.png',
  estimatedSize: '5MB',
  minApiLevel: 21,
  features: ['Theme Support', 'Favorites'],
};

const mockAppRow: Record<string, unknown> = {
  id: 'app-1',
  name: 'My Wallpapers',
  package_name: 'com.example.wallpapers',
  template_id: 'template-1',
  morph_values: '{"appName": "My Wallpapers"}',
  status: 'ready',
  apk_path: null,
  icon_path: '/icons/app-1.png',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

const mockTrendRow: Record<string, unknown> = {
  id: 'trend-1',
  keyword: 'aesthetic wallpapers',
  source: 'google-trends',
  score: 85,
  velocity: 12.5,
  first_seen: '2024-01-01T00:00:00.000Z',
  last_updated: '2024-01-15T00:00:00.000Z',
  suggested_category: 'wallpaper-pack',
  related_keywords: '["minimalist", "dark mode"]',
  metadata: '{"region": "US"}',
};

// =============================================================================
// Handler Registry for Testing
// =============================================================================

type HandlerFunction = (event: unknown, ...args: unknown[]) => Promise<unknown>;
const handlerRegistry = new Map<string, HandlerFunction>();

// Mock ipcMain.handle to capture handler registrations
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: HandlerFunction) => {
      handlerRegistry.set(channel, handler);
    }),
  },
  BrowserWindow: vi.fn(),
}));

// =============================================================================
// Test Helper Functions
// =============================================================================

function createMockContext(overrides: Partial<MockHandlerContext> = {}): MockHandlerContext {
  const mockSend = vi.fn();
  
  return {
    database: {
      run: vi.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
      all: vi.fn(() => []),
      get: vi.fn(() => undefined),
    },
    templateEngine: {
      getTemplates: vi.fn(() => []),
      getTemplate: vi.fn(() => undefined),
      refreshTemplates: vi.fn(() => []),
      validateTemplatePath: vi.fn(() => ({ valid: true })),
      morphTemplate: vi.fn(() => ({ success: true, outputPath: '/output/path' })),
    },
    buildPipeline: {
      buildApp: vi.fn(() => 'build-123'),
      cancelBuild: vi.fn(() => true),
      getBuildInfo: vi.fn(() => undefined),
    },
    mainWindow: () => ({
      webContents: { send: mockSend },
    }),
    ...overrides,
  };
}

async function invokeHandler<T>(channel: string, ...args: unknown[]): Promise<IPCResponse<T>> {
  const handler = handlerRegistry.get(channel);
  if (!handler) {
    throw new Error(`Handler not registered for channel: ${channel}`);
  }
  return handler({}, ...args) as Promise<IPCResponse<T>>;
}

// =============================================================================
// Import handlers after mocking
// =============================================================================

// We need to import setupIPCHandlers dynamically after mocks are in place
let setupIPCHandlers: (ctx: MockHandlerContext) => void;

beforeEach(async () => {
  handlerRegistry.clear();
  vi.clearAllMocks();
  
  // Dynamic import to ensure mocks are applied
  const module = await import('../../src/main/ipc/handlers');
  setupIPCHandlers = module.setupIPCHandlers as unknown as typeof setupIPCHandlers;
});

afterEach(() => {
  vi.resetModules();
});

// =============================================================================
// Template Handler Tests
// =============================================================================

describe('Template Handlers', () => {
  describe('template:list', () => {
    it('should return list of templates', async () => {
      const ctx = createMockContext();
      ctx.templateEngine!.getTemplates.mockReturnValue([mockTemplate]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Template[]>('template:list');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('template-1');
    });

    it('should return error when template engine not available', async () => {
      const ctx = createMockContext({ templateEngine: null });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Template[]>('template:list');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('template:get', () => {
    it('should return specific template by id', async () => {
      const ctx = createMockContext();
      ctx.templateEngine!.getTemplate.mockReturnValue(mockTemplate);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Template>('template:get', 'template-1');
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('template-1');
      expect(ctx.templateEngine!.getTemplate).toHaveBeenCalledWith('template-1');
    });

    it('should return error when template not found', async () => {
      const ctx = createMockContext();
      ctx.templateEngine!.getTemplate.mockReturnValue(undefined);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Template>('template:get', 'nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('template:refresh', () => {
    it('should refresh and return updated templates', async () => {
      const ctx = createMockContext();
      ctx.templateEngine!.refreshTemplates.mockReturnValue([mockTemplate]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Template[]>('template:refresh');
      
      expect(result.success).toBe(true);
      expect(ctx.templateEngine!.refreshTemplates).toHaveBeenCalled();
    });
  });

  describe('template:validate', () => {
    it('should validate template path successfully', async () => {
      const ctx = createMockContext();
      ctx.templateEngine!.validateTemplatePath.mockReturnValue({
        valid: true,
        template: mockTemplate,
      });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ valid: boolean; template?: Template }>(
        'template:validate',
        '/path/to/template'
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('should return validation failure with errors', async () => {
      const ctx = createMockContext();
      ctx.templateEngine!.validateTemplatePath.mockReturnValue({
        valid: false,
        errors: ['Missing template.json', 'Invalid structure'],
      });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ valid: boolean; errors?: string[] }>(
        'template:validate',
        '/invalid/path'
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
      expect(result.data?.errors).toContain('Missing template.json');
    });
  });
});

// =============================================================================
// App Handler Tests
// =============================================================================

describe('App Handlers', () => {
  describe('app:create', () => {
    it('should create new app and return it', async () => {
      const ctx = createMockContext();
      ctx.database!.get.mockReturnValue(mockAppRow);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:create', {
        name: 'My Wallpapers',
        packageName: 'com.example.wallpapers',
        templateId: 'template-1',
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('My Wallpapers');
      expect(ctx.database!.run).toHaveBeenCalled();
    });

    it('should return error when database not available', async () => {
      const ctx = createMockContext({ database: null });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:create', {
        name: 'Test',
        packageName: 'com.test',
        templateId: 'template-1',
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('app:list', () => {
    it('should return all apps sorted by updated_at', async () => {
      const ctx = createMockContext();
      ctx.database!.all.mockReturnValue([mockAppRow]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject[]>('app:list');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('app-1');
    });

    it('should return empty array when no apps exist', async () => {
      const ctx = createMockContext();
      ctx.database!.all.mockReturnValue([]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject[]>('app:list');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('app:get', () => {
    it('should return specific app by id', async () => {
      const ctx = createMockContext();
      ctx.database!.get.mockReturnValue(mockAppRow);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:get', 'app-1');
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('app-1');
      expect(result.data?.packageName).toBe('com.example.wallpapers');
    });

    it('should return error when app not found', async () => {
      const ctx = createMockContext();
      ctx.database!.get.mockReturnValue(undefined);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:get', 'nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('APP_NOT_FOUND');
    });
  });

  describe('app:update', () => {
    it('should update app and return updated version', async () => {
      const ctx = createMockContext();
      const updatedRow = { ...mockAppRow, name: 'Updated Name' };
      ctx.database!.get.mockReturnValue(updatedRow);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:update', 'app-1', {
        name: 'Updated Name',
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
      expect(ctx.database!.run).toHaveBeenCalled();
    });

    it('should handle multiple field updates', async () => {
      const ctx = createMockContext();
      ctx.database!.get.mockReturnValue(mockAppRow);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:update', 'app-1', {
        name: 'New Name',
        status: 'building',
        morphValues: { theme: 'dark' },
      });
      
      expect(result.success).toBe(true);
      expect(ctx.database!.run).toHaveBeenCalled();
    });
  });

  describe('app:delete', () => {
    it('should delete app and return success', async () => {
      const ctx = createMockContext();
      ctx.database!.run.mockReturnValue({ changes: 1 });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ deleted: boolean }>('app:delete', 'app-1');
      
      expect(result.success).toBe(true);
      expect(result.data?.deleted).toBe(true);
    });

    it('should return error when app not found for deletion', async () => {
      const ctx = createMockContext();
      ctx.database!.run.mockReturnValue({ changes: 0 });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ deleted: boolean }>('app:delete', 'nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('APP_NOT_FOUND');
    });
  });

  describe('app:morph', () => {
    it('should morph template and update app status', async () => {
      const ctx = createMockContext();
      ctx.database!.get.mockReturnValue(mockAppRow);
      ctx.templateEngine!.morphTemplate.mockResolvedValue({
        success: true,
        outputPath: '/output/morphed-app',
      });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:morph', 'app-1', {
        templateId: 'template-1',
        values: { appName: 'My App' },
        outputDir: '/output',
      });
      
      expect(result.success).toBe(true);
      expect(ctx.templateEngine!.morphTemplate).toHaveBeenCalledWith(
        'template-1',
        { appName: 'My App' },
        '/output'
      );
    });

    it('should update status to failed on morph error', async () => {
      const ctx = createMockContext();
      ctx.database!.get.mockReturnValue(mockAppRow);
      ctx.templateEngine!.morphTemplate.mockRejectedValue(new Error('Morph failed'));
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<AppProject>('app:morph', 'app-1', {
        templateId: 'template-1',
        values: {},
        outputDir: '/output',
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MORPH_FAILED');
    });
  });
});

// =============================================================================
// Build Handler Tests
// =============================================================================

describe('Build Handlers', () => {
  describe('build:start', () => {
    it('should start build and return build id', async () => {
      const ctx = createMockContext();
      ctx.buildPipeline!.buildApp.mockResolvedValue('build-123');
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ buildId: string }>('build:start', 'app-1', {
        projectPath: '/projects/app-1',
        outputDir: '/output',
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.buildId).toBe('build-123');
    });

    it('should return error when build pipeline not available', async () => {
      const ctx = createMockContext({ buildPipeline: null });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ buildId: string }>('build:start', 'app-1', {});
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('build:cancel', () => {
    it('should cancel build successfully', async () => {
      const ctx = createMockContext();
      ctx.buildPipeline!.cancelBuild.mockReturnValue(true);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ cancelled: boolean }>('build:cancel', 'build-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.cancelled).toBe(true);
    });

    it('should return error when build not found', async () => {
      const ctx = createMockContext();
      ctx.buildPipeline!.cancelBuild.mockReturnValue(false);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<{ cancelled: boolean }>('build:cancel', 'nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BUILD_NOT_FOUND');
    });
  });

  describe('build:status', () => {
    it('should return build status with progress', async () => {
      const ctx = createMockContext();
      ctx.buildPipeline!.getBuildInfo.mockReturnValue({
        id: 'build-123',
        status: 'running',
        progress: 45,
        stage: 'compiling',
        logs: ['Starting build...', 'Compiling...'],
      });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<BuildProgress>('build:status', 'build-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.progress).toBe(45);
      expect(result.data?.stage).toBe('compiling');
    });

    it('should return error when build not found', async () => {
      const ctx = createMockContext();
      ctx.buildPipeline!.getBuildInfo.mockReturnValue(undefined);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<BuildProgress>('build:status', 'nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BUILD_NOT_FOUND');
    });
  });

  describe('build:logs', () => {
    it('should return build logs', async () => {
      const ctx = createMockContext();
      const mockLogs = ['Starting build...', 'Compiling MainActivity.kt...', 'Build complete'];
      ctx.buildPipeline!.getBuildInfo.mockReturnValue({
        id: 'build-123',
        logs: mockLogs,
      });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<string[]>('build:logs', 'build-123');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toContain('Build complete');
    });

    it('should return empty array when no logs', async () => {
      const ctx = createMockContext();
      ctx.buildPipeline!.getBuildInfo.mockReturnValue({
        id: 'build-123',
        logs: undefined,
      });
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<string[]>('build:logs', 'build-123');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });
});

// =============================================================================
// Trend Handler Tests
// =============================================================================

describe('Trend Handlers', () => {
  describe('trend:scan', () => {
    it('should return trend analysis', async () => {
      const ctx = createMockContext();
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<TrendAnalysis>('trend:scan');
      
      expect(result.success).toBe(true);
      expect(result.data?.categoryBreakdown).toBeDefined();
      expect(result.data?.topTrends).toBeDefined();
    });
  });

  describe('trend:list', () => {
    it('should return list of trends sorted by score', async () => {
      const ctx = createMockContext();
      ctx.database!.all.mockReturnValue([mockTrendRow]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Trend[]>('trend:list');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].keyword).toBe('aesthetic wallpapers');
      expect(result.data![0].score).toBe(85);
    });

    it('should parse JSON fields correctly', async () => {
      const ctx = createMockContext();
      ctx.database!.all.mockReturnValue([mockTrendRow]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Trend[]>('trend:list');
      
      expect(result.success).toBe(true);
      expect(result.data![0].relatedKeywords).toContain('minimalist');
      expect(result.data![0].metadata).toHaveProperty('region', 'US');
    });
  });

  describe('trend:suggest', () => {
    it('should return trends for specific category', async () => {
      const ctx = createMockContext();
      ctx.database!.all.mockReturnValue([mockTrendRow]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Trend[]>('trend:suggest', 'wallpaper-pack');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].suggestedCategory).toBe('wallpaper-pack');
    });

    it('should return empty array for category with no trends', async () => {
      const ctx = createMockContext();
      ctx.database!.all.mockReturnValue([]);
      
      setupIPCHandlers(ctx);
      
      const result = await invokeHandler<Trend[]>('trend:suggest', 'ringtone-pack');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });
});

// =============================================================================
// Handler Registration Tests
// =============================================================================

describe('Handler Registration', () => {
  it('should register all expected handlers', async () => {
    const ctx = createMockContext();
    
    setupIPCHandlers(ctx);
    
    const expectedHandlers = [
      // Template handlers
      'template:list',
      'template:get',
      'template:refresh',
      'template:validate',
      // App handlers
      'app:create',
      'app:list',
      'app:get',
      'app:update',
      'app:delete',
      'app:morph',
      // Build handlers
      'build:start',
      'build:cancel',
      'build:status',
      'build:logs',
      // Trend handlers
      'trend:scan',
      'trend:list',
      'trend:suggest',
    ];
    
    for (const channel of expectedHandlers) {
      expect(handlerRegistry.has(channel)).toBe(true);
    }
  });

  it('should call ipcMain.handle for each handler', async () => {
    const ctx = createMockContext();
    
    setupIPCHandlers(ctx);
    
    expect(ipcMain.handle).toHaveBeenCalledTimes(17); // Total number of handlers
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  it('should return proper error format for all handler types', async () => {
    const ctx = createMockContext({
      database: null,
      templateEngine: null,
      buildPipeline: null,
    });
    
    setupIPCHandlers(ctx);
    
    const templateResult = await invokeHandler<Template[]>('template:list');
    const appResult = await invokeHandler<AppProject[]>('app:list');
    const buildResult = await invokeHandler<BuildProgress>('build:status', 'id');
    const trendResult = await invokeHandler<Trend[]>('trend:list');
    
    // All should have consistent error format
    for (const result of [templateResult, appResult, buildResult, trendResult]) {
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error?.message).toBeDefined();
    }
  });

  it('should handle thrown exceptions gracefully', async () => {
    const ctx = createMockContext();
    ctx.database!.all.mockImplementation(() => {
      throw new Error('Database connection lost');
    });
    
    setupIPCHandlers(ctx);
    
    const result = await invokeHandler<AppProject[]>('app:list');
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Database connection lost');
  });
});
