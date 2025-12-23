/**
 * AppForge Zero - Preload Script
 * 
 * Exposes a secure API from the main process to the renderer process.
 * Uses contextBridge to safely expose IPC functionality without enabling nodeIntegration.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// =============================================================================
// Type Definitions
// =============================================================================

interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// =============================================================================
// API Definition
// =============================================================================

const api = {
  // ===========================================================================
  // App Info
  // ===========================================================================
  
  /**
   * Get the app version
   */
  getVersion: (): Promise<string> => {
    return ipcRenderer.invoke('app:version');
  },
  
  /**
   * Get app paths (userData, documents, downloads, temp)
   */
  getPaths: (): Promise<{
    userData: string;
    documents: string;
    downloads: string;
    temp: string;
  }> => {
    return ipcRenderer.invoke('app:paths');
  },

  // ===========================================================================
  // Shell Operations
  // ===========================================================================
  
  /**
   * Open URL in default browser
   */
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },
  
  /**
   * Show file in system file explorer
   */
  showInFolder: (path: string): void => {
    ipcRenderer.invoke('shell:showItemInFolder', path);
  },

  // ===========================================================================
  // Dialogs
  // ===========================================================================
  
  /**
   * Open file selection dialog
   */
  openFileDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  }): Promise<{ canceled: boolean; filePaths: string[] }> => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },
  
  /**
   * Open save file dialog
   */
  saveFileDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<{ canceled: boolean; filePath?: string }> => {
    return ipcRenderer.invoke('dialog:saveFile', options);
  },
  
  /**
   * Show message box
   */
  showMessage: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
  }): Promise<{ response: number; checkboxChecked: boolean }> => {
    return ipcRenderer.invoke('dialog:showMessage', options);
  },

  // ===========================================================================
  // Templates
  // ===========================================================================
  
  templates: {
    /**
     * List all available templates
     */
    list: (): Promise<IPCResponse> => {
      return ipcRenderer.invoke('template:list');
    },
    
    /**
     * Get a specific template by ID
     */
    get: (id: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('template:get', id);
    },
    
    /**
     * Refresh templates from disk
     */
    refresh: (): Promise<IPCResponse> => {
      return ipcRenderer.invoke('template:refresh');
    },
    
    /**
     * Validate a template at given path
     */
    validate: (path: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('template:validate', path);
    },
  },

  // ===========================================================================
  // Apps/Projects
  // ===========================================================================
  
  apps: {
    /**
     * Create a new app project
     */
    create: (data: {
      name?: string;
      packageName?: string;
      templateId?: string;
      templateCategory?: string;
    }): Promise<IPCResponse> => {
      return ipcRenderer.invoke('app:create', data);
    },
    
    /**
     * List all apps
     */
    list: (): Promise<IPCResponse> => {
      return ipcRenderer.invoke('app:list');
    },
    
    /**
     * Get a specific app by ID
     */
    get: (id: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('app:get', id);
    },
    
    /**
     * Update an app
     */
    update: (id: string, data: Record<string, unknown>): Promise<IPCResponse> => {
      return ipcRenderer.invoke('app:update', id, data);
    },
    
    /**
     * Delete an app
     */
    delete: (id: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('app:delete', id);
    },
    
    /**
     * Morph an app with new values
     */
    morph: (id: string, values: Array<{ key: string; value: unknown }>): Promise<IPCResponse> => {
      return ipcRenderer.invoke('app:morph', id, values);
    },
  },

  // ===========================================================================
  // Builds
  // ===========================================================================
  
  builds: {
    /**
     * Start a new build
     */
    start: (config: {
      appId: string;
      outputDir: string;
      debugBuild: boolean;
      signConfig?: {
        keystorePath: string;
        keystorePassword: string;
        keyAlias: string;
        keyPassword: string;
      };
      optimizations?: {
        minify: boolean;
        shrinkResources: boolean;
        enableR8: boolean;
      };
    }): Promise<IPCResponse> => {
      return ipcRenderer.invoke('build:start', config);
    },
    
    /**
     * Cancel a running build
     */
    cancel: (buildId: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('build:cancel', buildId);
    },
    
    /**
     * Get build status
     */
    status: (buildId: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('build:status', buildId);
    },
    
    /**
     * Get build logs
     */
    logs: (buildId: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('build:logs', buildId);
    },
    
    /**
     * Subscribe to build progress events
     */
    onProgress: (callback: (progress: {
      buildId: string;
      stage: string;
      progress: number;
      currentTask: string;
    }) => void): () => void => {
      const handler = (_event: IpcRendererEvent, progress: unknown) => {
        callback(progress as {
          buildId: string;
          stage: string;
          progress: number;
          currentTask: string;
        });
      };
      ipcRenderer.on('build:progress', handler);
      return () => {
        ipcRenderer.removeListener('build:progress', handler);
      };
    },
  },

  // ===========================================================================
  // Trends
  // ===========================================================================
  
  trends: {
    /**
     * Scan for new trends
     */
    scan: (): Promise<IPCResponse> => {
      return ipcRenderer.invoke('trend:scan');
    },
    
    /**
     * List all trends
     */
    list: (): Promise<IPCResponse> => {
      return ipcRenderer.invoke('trend:list');
    },
    
    /**
     * Get trend suggestions for a category
     */
    suggest: (category: string): Promise<IPCResponse> => {
      return ipcRenderer.invoke('trend:suggest', category);
    },
  },

  // ===========================================================================
  // Event Subscriptions
  // ===========================================================================
  
  /**
   * Generic event subscription
   */
  on: (channel: string, callback: (...args: unknown[]) => void): () => void => {
    // Whitelist of allowed channels
    const validChannels = [
      'build:progress',
      'trend:update',
      'notification',
    ];
    
    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };
    
    ipcRenderer.on(channel, handler);
    
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  
  /**
   * One-time event subscription
   */
  once: (channel: string, callback: (...args: unknown[]) => void): void => {
    const validChannels = [
      'build:progress',
      'trend:update',
      'notification',
    ];
    
    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    
    ipcRenderer.once(channel, (_event: IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    });
  },
};

// =============================================================================
// Expose API to Renderer
// =============================================================================

contextBridge.exposeInMainWorld('appforge', api);

// =============================================================================
// Type Declaration for Renderer
// =============================================================================

export type AppForgeAPI = typeof api;
