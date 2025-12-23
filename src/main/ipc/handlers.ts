/**
 * AppForge Zero - IPC Handlers
 * 
 * Registers all IPC handlers for communication between main and renderer processes.
 * Organized by domain: templates, apps, builds, trends, settings.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseService } from '../database/Database';
import type { TemplateEngine } from '../services/TemplateEngine';
import type { BuildPipeline } from '../services/BuildPipeline';
import type {
  IPCResponse,
  Template,
  AppProject,
  MorphValue,
  BuildConfig,
  BuildProgress,
  Trend,
  TrendAnalysis,
  TemplateCategory,
} from '../../shared/types';

// =============================================================================
// Handler Context
// =============================================================================

interface HandlerContext {
  database: DatabaseService | null;
  templateEngine: TemplateEngine | null;
  buildPipeline: BuildPipeline | null;
  mainWindow: () => BrowserWindow | null;
}

// =============================================================================
// Response Helpers
// =============================================================================

function success<T>(data: T): IPCResponse<T> {
  return { success: true, data };
}

function error(code: string, message: string, details?: unknown): IPCResponse {
  return { 
    success: false, 
    error: { code, message, details } 
  };
}

// =============================================================================
// Template Handlers
// =============================================================================

function setupTemplateHandlers(ctx: HandlerContext): void {
  // List all available templates
  ipcMain.handle('template:list', async (): Promise<IPCResponse<Template[]>> => {
    try {
      if (!ctx.templateEngine) {
        return error('SERVICE_UNAVAILABLE', 'Template engine not initialized');
      }
      
      const templates = ctx.templateEngine.getLoadedTemplates();
      return success(templates);
    } catch (err) {
      return error('TEMPLATE_LIST_ERROR', (err as Error).message);
    }
  });

  // Get a specific template
  ipcMain.handle('template:get', async (_, id: string): Promise<IPCResponse<Template>> => {
    try {
      if (!ctx.templateEngine) {
        return error('SERVICE_UNAVAILABLE', 'Template engine not initialized');
      }
      
      const templates = ctx.templateEngine.getLoadedTemplates();
      const template = templates.find(t => t.id === id);
      
      if (!template) {
        return error('TEMPLATE_NOT_FOUND', `Template with id ${id} not found`);
      }
      
      return success(template);
    } catch (err) {
      return error('TEMPLATE_GET_ERROR', (err as Error).message);
    }
  });

  // Refresh templates from disk
  ipcMain.handle('template:refresh', async (): Promise<IPCResponse<void>> => {
    try {
      if (!ctx.templateEngine) {
        return error('SERVICE_UNAVAILABLE', 'Template engine not initialized');
      }
      
      await ctx.templateEngine.loadAllTemplates();
      return success(undefined);
    } catch (err) {
      return error('TEMPLATE_REFRESH_ERROR', (err as Error).message);
    }
  });

  // Validate a template path
  ipcMain.handle('template:validate', async (_, path: string): Promise<IPCResponse<boolean>> => {
    try {
      if (!ctx.templateEngine) {
        return error('SERVICE_UNAVAILABLE', 'Template engine not initialized');
      }
      
      const isValid = await ctx.templateEngine.validateTemplate(path);
      return success(isValid);
    } catch (err) {
      return error('TEMPLATE_VALIDATE_ERROR', (err as Error).message);
    }
  });
}

// =============================================================================
// App/Project Handlers
// =============================================================================

function setupAppHandlers(ctx: HandlerContext): void {
  // Create a new app project
  ipcMain.handle('app:create', async (_, data: Partial<AppProject>): Promise<IPCResponse<AppProject>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      const now = new Date();
      const app: AppProject = {
        id: uuidv4(),
        name: data.name || 'Untitled App',
        packageName: data.packageName || 'com.example.app',
        templateId: data.templateId || '',
        templateCategory: data.templateCategory || 'utility',
        morphValues: data.morphValues || [],
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        buildHistory: [],
      };
      
      // Insert into database
      ctx.database.run(`
        INSERT INTO apps (id, name, package_name, template_id, template_category, morph_values, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [app.id, app.name, app.packageName, app.templateId, app.templateCategory, JSON.stringify(app.morphValues), app.status, app.createdAt.toISOString(), app.updatedAt.toISOString()]);
      
      return success(app);
    } catch (err) {
      return error('APP_CREATE_ERROR', (err as Error).message);
    }
  });

  // List all apps
  ipcMain.handle('app:list', async (): Promise<IPCResponse<AppProject[]>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      const rows = ctx.database.all<Record<string, unknown>>(`
        SELECT * FROM apps ORDER BY updated_at DESC
      `);
      
      const apps: AppProject[] = rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        packageName: row.package_name as string,
        templateId: row.template_id as string,
        templateCategory: row.template_category as TemplateCategory,
        morphValues: JSON.parse((row.morph_values as string) || '[]'),
        status: row.status as AppProject['status'],
        apkPath: row.apk_path as string | undefined,
        iconPath: row.icon_path as string | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        buildHistory: [],
      }));
      
      return success(apps);
    } catch (err) {
      return error('APP_LIST_ERROR', (err as Error).message);
    }
  });

  // Get a specific app
  ipcMain.handle('app:get', async (_, id: string): Promise<IPCResponse<AppProject>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      const row = ctx.database.get<Record<string, unknown>>(`
        SELECT * FROM apps WHERE id = ?
      `, [id]);
      
      if (!row) {
        return error('APP_NOT_FOUND', `App with id ${id} not found`);
      }
      
      const app: AppProject = {
        id: row.id as string,
        name: row.name as string,
        packageName: row.package_name as string,
        templateId: row.template_id as string,
        templateCategory: row.template_category as TemplateCategory,
        morphValues: JSON.parse((row.morph_values as string) || '[]'),
        status: row.status as AppProject['status'],
        apkPath: row.apk_path as string | undefined,
        iconPath: row.icon_path as string | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        buildHistory: [],
      };
      
      return success(app);
    } catch (err) {
      return error('APP_GET_ERROR', (err as Error).message);
    }
  });

  // Update an app
  ipcMain.handle('app:update', async (_, id: string, data: Partial<AppProject>): Promise<IPCResponse<AppProject>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      const now = new Date();
      const fields: string[] = [];
      const values: unknown[] = [];
      
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.packageName !== undefined) { fields.push('package_name = ?'); values.push(data.packageName); }
      if (data.morphValues !== undefined) { fields.push('morph_values = ?'); values.push(JSON.stringify(data.morphValues)); }
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
      if (data.apkPath !== undefined) { fields.push('apk_path = ?'); values.push(data.apkPath); }
      if (data.iconPath !== undefined) { fields.push('icon_path = ?'); values.push(data.iconPath); }
      
      fields.push('updated_at = ?');
      values.push(now.toISOString());
      values.push(id);
      
      ctx.database.run(`
        UPDATE apps SET ${fields.join(', ')} WHERE id = ?
      `, values);
      
      // Fetch updated app
      const result = await ipcMain.handle('app:get', null as never, id);
      return result as IPCResponse<AppProject>;
    } catch (err) {
      return error('APP_UPDATE_ERROR', (err as Error).message);
    }
  });

  // Delete an app
  ipcMain.handle('app:delete', async (_, id: string): Promise<IPCResponse<void>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      ctx.database.run(`DELETE FROM apps WHERE id = ?`, [id]);
      return success(undefined);
    } catch (err) {
      return error('APP_DELETE_ERROR', (err as Error).message);
    }
  });

  // Morph an app with new values
  ipcMain.handle('app:morph', async (_, id: string, values: MorphValue[]): Promise<IPCResponse<void>> => {
    try {
      if (!ctx.database || !ctx.templateEngine) {
        return error('SERVICE_UNAVAILABLE', 'Required services not initialized');
      }
      
      // Get the app
      const appResult = await ipcMain.handle('app:get', null as never, id) as IPCResponse<AppProject>;
      if (!appResult.success || !appResult.data) {
        return error('APP_NOT_FOUND', `App with id ${id} not found`);
      }
      
      const app = appResult.data;
      
      // Update status to morphing
      ctx.database.run(`
        UPDATE apps SET status = 'morphing', updated_at = ? WHERE id = ?
      `, [new Date().toISOString(), id]);
      
      // Perform the morph
      const outputDir = `./output/${id}`;
      await ctx.templateEngine.morphTemplate(app.templateId, values, outputDir);
      
      // Update status to ready
      ctx.database.run(`
        UPDATE apps SET status = 'ready', morph_values = ?, updated_at = ? WHERE id = ?
      `, [JSON.stringify(values), new Date().toISOString(), id]);
      
      return success(undefined);
    } catch (err) {
      // Update status to failed
      if (ctx.database) {
        ctx.database.run(`
          UPDATE apps SET status = 'failed', updated_at = ? WHERE id = ?
        `, [new Date().toISOString(), id]);
      }
      return error('APP_MORPH_ERROR', (err as Error).message);
    }
  });
}

// =============================================================================
// Build Handlers
// =============================================================================

function setupBuildHandlers(ctx: HandlerContext): void {
  // Start a build
  ipcMain.handle('build:start', async (_, config: BuildConfig): Promise<IPCResponse<{ buildId: string }>> => {
    try {
      if (!ctx.buildPipeline) {
        return error('SERVICE_UNAVAILABLE', 'Build pipeline not initialized. Is Android SDK configured?');
      }
      
      const buildId = await ctx.buildPipeline.buildApp(config);
      
      // Send progress updates to renderer
      const progressInterval = setInterval(() => {
        if (!ctx.buildPipeline) {
          clearInterval(progressInterval);
          return;
        }
        
        const info = ctx.buildPipeline.getBuildInfo(buildId);
        if (!info) {
          clearInterval(progressInterval);
          return;
        }
        
        const window = ctx.mainWindow();
        if (window) {
          window.webContents.send('build:progress', {
            buildId,
            stage: info.status === 'running' ? 'compiling' : info.status,
            progress: info.progress || 0,
            currentTask: info.currentTask || 'Building...',
          } as BuildProgress);
        }
        
        if (info.status === 'success' || info.status === 'failed' || info.status === 'cancelled') {
          clearInterval(progressInterval);
        }
      }, 1000);
      
      return success({ buildId });
    } catch (err) {
      return error('BUILD_START_ERROR', (err as Error).message);
    }
  });

  // Cancel a build
  ipcMain.handle('build:cancel', async (_, buildId: string): Promise<IPCResponse<void>> => {
    try {
      if (!ctx.buildPipeline) {
        return error('SERVICE_UNAVAILABLE', 'Build pipeline not initialized');
      }
      
      await ctx.buildPipeline.cancelBuild(buildId);
      return success(undefined);
    } catch (err) {
      return error('BUILD_CANCEL_ERROR', (err as Error).message);
    }
  });

  // Get build status
  ipcMain.handle('build:status', async (_, buildId: string): Promise<IPCResponse<BuildProgress>> => {
    try {
      if (!ctx.buildPipeline) {
        return error('SERVICE_UNAVAILABLE', 'Build pipeline not initialized');
      }
      
      const info = ctx.buildPipeline.getBuildInfo(buildId);
      if (!info) {
        return error('BUILD_NOT_FOUND', `Build with id ${buildId} not found`);
      }
      
      const progress: BuildProgress = {
        buildId,
        stage: info.status === 'running' ? 'compiling' : 
               info.status === 'success' ? 'complete' :
               info.status === 'failed' ? 'failed' : 'preparing',
        progress: info.progress || 0,
        currentTask: info.currentTask || 'Unknown',
      };
      
      return success(progress);
    } catch (err) {
      return error('BUILD_STATUS_ERROR', (err as Error).message);
    }
  });

  // Get build logs
  ipcMain.handle('build:logs', async (_, buildId: string): Promise<IPCResponse<string[]>> => {
    try {
      if (!ctx.buildPipeline) {
        return error('SERVICE_UNAVAILABLE', 'Build pipeline not initialized');
      }
      
      const info = ctx.buildPipeline.getBuildInfo(buildId);
      if (!info) {
        return error('BUILD_NOT_FOUND', `Build with id ${buildId} not found`);
      }
      
      return success(info.logs || []);
    } catch (err) {
      return error('BUILD_LOGS_ERROR', (err as Error).message);
    }
  });
}

// =============================================================================
// Trend Handlers
// =============================================================================

function setupTrendHandlers(ctx: HandlerContext): void {
  // Scan for new trends
  ipcMain.handle('trend:scan', async (): Promise<IPCResponse<TrendAnalysis>> => {
    try {
      // TODO: Implement actual trend scanning
      // For now, return mock data
      const analysis: TrendAnalysis = {
        timestamp: new Date(),
        topTrends: [],
        emergingTrends: [],
        decliningTrends: [],
        categoryBreakdown: {
          'wallpaper-pack': 35,
          'quote-cards': 25,
          'sound-boards': 20,
          'ringtone-pack': 10,
          'icon-pack': 5,
          'widget-pack': 3,
          'utility': 1,
          'entertainment': 1,
        },
      };
      
      return success(analysis);
    } catch (err) {
      return error('TREND_SCAN_ERROR', (err as Error).message);
    }
  });

  // List all trends
  ipcMain.handle('trend:list', async (): Promise<IPCResponse<Trend[]>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      const rows = ctx.database.all<Record<string, unknown>>(`
        SELECT * FROM trends ORDER BY score DESC LIMIT 50
      `);
      
      const trends: Trend[] = rows.map((row) => ({
        id: row.id as string,
        keyword: row.keyword as string,
        source: row.source as Trend['source'],
        score: row.score as number,
        velocity: row.velocity as number,
        firstSeen: new Date(row.first_seen as string),
        lastUpdated: new Date(row.last_updated as string),
        suggestedCategory: row.suggested_category as TemplateCategory | undefined,
        relatedKeywords: JSON.parse((row.related_keywords as string) || '[]'),
        metadata: JSON.parse((row.metadata as string) || '{}'),
      }));
      
      return success(trends);
    } catch (err) {
      return error('TREND_LIST_ERROR', (err as Error).message);
    }
  });

  // Get trends for a category
  ipcMain.handle('trend:suggest', async (_, category: TemplateCategory): Promise<IPCResponse<Trend[]>> => {
    try {
      if (!ctx.database) {
        return error('SERVICE_UNAVAILABLE', 'Database not initialized');
      }
      
      const rows = ctx.database.all<Record<string, unknown>>(`
        SELECT * FROM trends 
        WHERE suggested_category = ? 
        ORDER BY score DESC 
        LIMIT 20
      `, [category]);
      
      const trends: Trend[] = rows.map((row) => ({
        id: row.id as string,
        keyword: row.keyword as string,
        source: row.source as Trend['source'],
        score: row.score as number,
        velocity: row.velocity as number,
        firstSeen: new Date(row.first_seen as string),
        lastUpdated: new Date(row.last_updated as string),
        suggestedCategory: row.suggested_category as TemplateCategory,
        relatedKeywords: JSON.parse((row.related_keywords as string) || '[]'),
        metadata: JSON.parse((row.metadata as string) || '{}'),
      }));
      
      return success(trends);
    } catch (err) {
      return error('TREND_SUGGEST_ERROR', (err as Error).message);
    }
  });
}

// =============================================================================
// Setup All Handlers
// =============================================================================

export function setupIPCHandlers(ctx: HandlerContext): void {
  console.log('[IPC] Setting up handlers...');
  
  setupTemplateHandlers(ctx);
  console.log('[IPC] Template handlers registered');
  
  setupAppHandlers(ctx);
  console.log('[IPC] App handlers registered');
  
  setupBuildHandlers(ctx);
  console.log('[IPC] Build handlers registered');
  
  setupTrendHandlers(ctx);
  console.log('[IPC] Trend handlers registered');
  
  console.log('[IPC] All handlers registered successfully');
}
