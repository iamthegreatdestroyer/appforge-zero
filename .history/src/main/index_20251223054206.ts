/**
 * AppForge Zero - Main Process Entry Point
 * 
 * Initializes Electron application, manages windows, and sets up IPC handlers.
 * This is the entry point for the main (Node.js) process of the Electron app.
 */

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { DatabaseService } from './database/Database';
import { TemplateEngine } from './services/TemplateEngine';
import { BuildPipeline } from './services/BuildPipeline';
import { setupIPCHandlers } from './ipc/handlers';
import icon from '../../resources/icon.png?asset';

// =============================================================================
// Global Services
// =============================================================================

let mainWindow: BrowserWindow | null = null;
let database: DatabaseService | null = null;
let templateEngine: TemplateEngine | null = null;
let buildPipeline: BuildPipeline | null = null;

// =============================================================================
// Window Management
// =============================================================================

function createWindow(): void {
  // Create the main browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Don't show until ready-to-show
    autoHideMenuBar: true,
    backgroundColor: '#0f172a', // slate-900 for seamless loading
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Graceful window display
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    
    // Open DevTools in development
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =============================================================================
// Service Initialization
// =============================================================================

async function initializeServices(): Promise<void> {
  console.log('[Main] Initializing services...');

  try {
    // Initialize database
    const dbPath = join(app.getPath('userData'), 'appforge.db');
    database = new DatabaseService(dbPath);
    await database.initialize();
    console.log('[Main] Database initialized');

    // Initialize template engine
    const templatesPath = is.dev
      ? join(__dirname, '../../templates')
      : join(process.resourcesPath, 'templates');
    templateEngine = new TemplateEngine(templatesPath);
    console.log('[Main] Template engine initialized');

    // Initialize build pipeline
    const androidSdkPath = process.env['ANDROID_SDK_ROOT'] || 
                           process.env['ANDROID_HOME'] || 
                           '';
    if (androidSdkPath) {
      buildPipeline = new BuildPipeline(androidSdkPath);
      console.log('[Main] Build pipeline initialized');
    } else {
      console.warn('[Main] Android SDK not found - build features disabled');
    }

    // Setup IPC handlers
    setupIPCHandlers({
      database,
      templateEngine,
      buildPipeline,
      mainWindow: () => mainWindow,
    });
    console.log('[Main] IPC handlers registered');

  } catch (error) {
    console.error('[Main] Service initialization failed:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize AppForge Zero: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    app.quit();
  }
}

// =============================================================================
// Application Lifecycle
// =============================================================================

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.appforge.zero');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Initialize services before creating window
  await initializeServices();

  // Create the main window
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on app quit
app.on('before-quit', async () => {
  console.log('[Main] Application quitting...');
  
  // Cancel any running builds
  if (buildPipeline) {
    const builds = buildPipeline.getActiveBuilds();
    for (const buildId of builds) {
      await buildPipeline.cancelBuild(buildId);
    }
  }

  // Close database connection
  if (database) {
    database.close();
  }
});

// =============================================================================
// Error Handling
// =============================================================================

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
  dialog.showErrorBox('Unexpected Error', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason);
});

// =============================================================================
// IPC Event Handlers (Basic)
// =============================================================================

// Handle app version request
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// Handle app paths request
ipcMain.handle('app:paths', () => {
  return {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    temp: app.getPath('temp'),
  };
});

// Handle open external URL
ipcMain.handle('shell:openExternal', async (_, url: string) => {
  await shell.openExternal(url);
});

// Handle show item in folder
ipcMain.handle('shell:showItemInFolder', (_, path: string) => {
  shell.showItemInFolder(path);
});

// Handle file/folder selection dialogs
ipcMain.handle('dialog:openFile', async (_, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('dialog:saveFile', async (_, options: Electron.SaveDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePath: undefined };
  return dialog.showSaveDialog(mainWindow, options);
});

// Handle message box
ipcMain.handle('dialog:showMessage', async (_, options: Electron.MessageBoxOptions) => {
  if (!mainWindow) return { response: 0, checkboxChecked: false };
  return dialog.showMessageBox(mainWindow, options);
});

// =============================================================================
// Export for testing
// =============================================================================

export {
  mainWindow,
  database,
  templateEngine,
  buildPipeline,
};
