/**
 * Main Process Integration - IPC Handler Setup
 * This file shows how to integrate IPC handlers with the Electron main process
 *
 * Usage: Call registerAllIPCHandlers() when the app is ready
 */

import { app, BrowserWindow } from "electron";
import { registerAllIPCHandlers } from "./ipc";

/**
 * Initialize IPC handlers when Electron app is ready
 * Call this in your main process when app.on('ready') fires
 */
export function initializeIPCHandlers(): void {
  try {
    registerAllIPCHandlers();
    console.log("[Main] IPC handlers initialized successfully");
  } catch (error) {
    console.error("[Main] Failed to initialize IPC handlers:", error);
    process.exit(1);
  }
}

/**
 * Example integration in main.ts:
 *
 * import { app, BrowserWindow } from 'electron';
 * import { initializeIPCHandlers } from './ipc-integration';
 *
 * app.on('ready', () => {
 *   // Initialize IPC handlers first
 *   initializeIPCHandlers();
 *
 *   // Create main window
 *   const mainWindow = new BrowserWindow({
 *     width: 1200,
 *     height: 800,
 *     webPreferences: {
 *       preload: path.join(__dirname, 'preload.ts'),
 *       nodeIntegration: false,
 *       contextIsolation: true,
 *     },
 *   });
 *
 *   mainWindow.loadURL(...);
 * });
 */

export { registerAllIPCHandlers };
