/**
 * IPC Handler Registry - Central registration point for all IPC handlers
 * This file initializes all handlers when the main process starts
 */

import TemplateIPCHandler from "./template.handler";
import BuildIPCHandler from "./build.handler";
import TrendIPCHandler from "./trend.handler";
import DistributionIPCHandler from "./distribution.handler";

/**
 * Register all IPC handlers with the main process
 * Call this function when the app is ready
 */
export function registerAllIPCHandlers(): void {
  console.log("[IPC] Registering all IPC handlers...");

  try {
    TemplateIPCHandler.register();
    BuildIPCHandler.register();
    TrendIPCHandler.register();
    DistributionIPCHandler.register();

    console.log("[IPC] ✓ All IPC handlers registered successfully");
  } catch (error) {
    console.error("[IPC] Failed to register handlers:", error);
    throw error;
  }
}

// Export all handlers for direct access if needed
export { default as TemplateIPCHandler } from "./template.handler";
export { default as BuildIPCHandler } from "./build.handler";
export { default as TrendIPCHandler } from "./trend.handler";
export { default as DistributionIPCHandler } from "./distribution.handler";

// Export all types
export * from "./types";
