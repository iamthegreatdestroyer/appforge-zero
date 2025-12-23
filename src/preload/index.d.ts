/**
 * AppForge Zero - Preload Type Declarations
 * 
 * Provides TypeScript type declarations for the window.appforge API
 * exposed by the preload script via contextBridge.
 */

import type { AppForgeAPI } from './index';

declare global {
  interface Window {
    /**
     * AppForge Zero API exposed from main process
     */
    appforge: AppForgeAPI;
  }
}

export {};
