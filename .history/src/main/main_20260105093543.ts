import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { initializeDatabase } from './database/schema';
import { JWTManager } from './auth/jwt-oauth';
import { TemplateEngine } from './services/template.engine';
import { TrendScanner } from './services/trend.scanner';
import { AssetManager } from './services/asset.manager';
import { BuildPipeline } from './services/build.pipeline';
import { DistributionService } from './services/distribution';

let mainWindow: BrowserWindow | null = null;
let jwtManager: JWTManager;
let templateEngine: TemplateEngine;
let trendScanner: TrendScanner;
let assetManager: AssetManager;
let buildPipeline: BuildPipeline;
let distributionService: DistributionService;

/**
 * Create the main application window
 */
function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
    },
    icon: icon,
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    return { action: 'deny' };
  });

  // HMR for electron serve
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools in development
  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Initialize services
    jwtManager = new JWTManager();
    templateEngine = new TemplateEngine();
    trendScanner = new TrendScanner();
    assetManager = new AssetManager();
    buildPipeline = new BuildPipeline();
    distributionService = new DistributionService();

    console.log('✅ All services initialized');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}

/**
 * Register IPC handlers for main/renderer communication
 */
function registerIpcHandlers(): void {
  // Authentication
  ipcMain.handle('auth:login', async (_event, provider: string) => {
    return await jwtManager.authenticate(provider);
  });

  ipcMain.handle('auth:logout', async () => {
    return await jwtManager.logout();
  });

  ipcMain.handle('auth:getUser', async () => {
    return jwtManager.getCurrentUser();
  });

  // Template engine
  ipcMain.handle('template:list', async () => {
    return await templateEngine.listTemplates();
  });

  ipcMain.handle('template:morph', async (_event, template: any, context: any) => {
    return await templateEngine.morphTemplate(template, context);
  });

  // Trend scanner
  ipcMain.handle('trends:getTrending', async () => {
    return await trendScanner.getTrendingTopics();
  });

  ipcMain.handle('trends:analyzeOpportunity', async (_event, trend: string) => {
    return await trendScanner.analyzeOpportunity(trend);
  });

  // Asset manager
  ipcMain.handle('assets:search', async (_event, query: string) => {
    return await assetManager.searchAssets(query);
  });

  ipcMain.handle('assets:getCategories', async () => {
    return await assetManager.getCategories();
  });

  // Build pipeline
  ipcMain.handle('build:start', async (_event, config: any) => {
    return await buildPipeline.buildAPK(config);
  });

  ipcMain.handle('build:getStatus', async () => {
    return await buildPipeline.getBuildStatus();
  });

  // Distribution
  ipcMain.handle('distribution:publish', async (_event, appData: any) => {
    return await distributionService.publishToGumroad(appData);
  });

  ipcMain.handle('distribution:getStats', async () => {
    return await distributionService.getAnalytics();
  });
}

/**
 * App event handlers
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * App startup
 */
app.on('ready', async () => {
  try {
    console.log('🚀 Initializing AppForge Zero...');
    
    // Initialize services first
    await initializeServices();
    
    // Then create window
    createWindow();
    
    // Register IPC handlers
    registerIpcHandlers();
    
    console.log('✅ AppForge Zero launched successfully!');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    app.quit();
  }
});

/**
 * Create application menu
 */
function createMenu(): void {
  const template: any = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About AppForge Zero',
          click: () => {
            // Show about dialog
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create menu on app ready
app.on('ready', createMenu);

export { mainWindow };
