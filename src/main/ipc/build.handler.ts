/**
 * Build IPC Handler - Manages all build pipeline operations
 * Handles build creation, queuing, starting, cancellation, and log retrieval
 */

import { ipcMain, IpcMainEvent } from "electron";
import {
  IPC_BuildCreateRequest,
  IPC_BuildCreateResponse,
  IPC_BuildQueueRequest,
  IPC_BuildQueueResponse,
  IPC_BuildStartRequest,
  IPC_BuildStartResponse,
  IPC_BuildCancelRequest,
  IPC_BuildCancelResponse,
  IPC_BuildLogsRequest,
  IPC_BuildLogsResponse,
  IPC_ErrorResponse,
} from "./types";

// Simulated build job database
const BUILD_JOBS: Record<
  string,
  {
    jobId: string;
    appId: string;
    status: string;
    queuePosition: number;
    phase?: string;
    startTime?: number;
    estimatedCompletionTime?: number;
    logs: Array<{
      timestamp: number;
      level: "info" | "warn" | "error";
      message: string;
      context?: string;
    }>;
    configuration: any;
  }
> = {};

const BUILD_QUEUE: string[] = [];

class BuildIPCHandler {
  /**
   * Register all build-related IPC handlers
   */
  static register(): void {
    ipcMain.handle("build:create", this.handleCreate);
    ipcMain.handle("build:queue", this.handleQueue);
    ipcMain.handle("build:start", this.handleStart);
    ipcMain.handle("build:cancel", this.handleCancel);
    ipcMain.handle("build:logs", this.handleLogs);

    console.log("[IPC] Build handlers registered");
  }

  /**
   * Handle build creation request
   */
  static async handleCreate(
    event: IpcMainEvent,
    request: IPC_BuildCreateRequest
  ): Promise<IPC_BuildCreateResponse | IPC_ErrorResponse> {
    try {
      const { appId, templateId, configuration } = request;

      // Validation
      if (!appId || !templateId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "appId and templateId are required",
        };
      }

      // Generate job ID
      const jobId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add to queue
      BUILD_QUEUE.push(jobId);
      const queuePosition = BUILD_QUEUE.length;

      // Create job record
      BUILD_JOBS[jobId] = {
        jobId,
        appId,
        status: "queued",
        queuePosition,
        logs: [
          {
            timestamp: Date.now(),
            level: "info",
            message: `Build job created for app '${appId}'`,
            context: "build-init",
          },
          {
            timestamp: Date.now(),
            level: "info",
            message: `Configuration: ${JSON.stringify(configuration)}`,
            context: "build-config",
          },
        ],
        configuration,
      };

      console.log(
        `[IPC] Build job created: ${jobId} for app '${appId}' (queue position: ${queuePosition})`
      );

      return {
        jobId,
        appId,
        status: "queued",
        queuePosition,
        estimatedWaitTime: queuePosition * 30000, // 30s per job estimate
      };
    } catch (error) {
      console.error("[IPC] Error in build:create:", error);
      return {
        error: true,
        code: "BUILD_CREATE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle queue status request
   */
  static async handleQueue(
    event: IpcMainEvent,
    request: IPC_BuildQueueRequest
  ): Promise<IPC_BuildQueueResponse | IPC_ErrorResponse> {
    try {
      const { jobId } = request;

      if (!jobId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "jobId is required",
        };
      }

      const job = BUILD_JOBS[jobId];
      if (!job) {
        return {
          error: true,
          code: "JOB_NOT_FOUND",
          message: `Job with ID '${jobId}' not found`,
        };
      }

      const queuePosition = BUILD_QUEUE.indexOf(jobId) + 1;

      return {
        jobId,
        queuePosition,
        totalInQueue: BUILD_QUEUE.length,
        estimatedWaitTime: queuePosition * 30000,
      };
    } catch (error) {
      console.error("[IPC] Error in build:queue:", error);
      return {
        error: true,
        code: "QUEUE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle build start request
   */
  static async handleStart(
    event: IpcMainEvent,
    request: IPC_BuildStartRequest
  ): Promise<IPC_BuildStartResponse | IPC_ErrorResponse> {
    try {
      const { jobId } = request;

      if (!jobId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "jobId is required",
        };
      }

      const job = BUILD_JOBS[jobId];
      if (!job) {
        return {
          error: true,
          code: "JOB_NOT_FOUND",
          message: `Job with ID '${jobId}' not found`,
        };
      }

      // Remove from queue
      const queueIndex = BUILD_QUEUE.indexOf(jobId);
      if (queueIndex > -1) {
        BUILD_QUEUE.splice(queueIndex, 1);
      }

      // Update job
      const startTime = Date.now();
      const estimatedCompletionTime = startTime + 120000; // 2 min estimate

      job.status = "running";
      job.phase = "preparing";
      job.startTime = startTime;
      job.estimatedCompletionTime = estimatedCompletionTime;

      job.logs.push({
        timestamp: Date.now(),
        level: "info",
        message: "Build started - Preparing build environment",
        context: "build-start",
      });

      console.log(`[IPC] Build job started: ${jobId}`);

      // Simulate build phases
      this.simulateBuildPhases(jobId);

      return {
        jobId,
        status: "running",
        phase: "preparing",
        startTime,
        estimatedCompletionTime,
      };
    } catch (error) {
      console.error("[IPC] Error in build:start:", error);
      return {
        error: true,
        code: "BUILD_START_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle build cancellation request
   */
  static async handleCancel(
    event: IpcMainEvent,
    request: IPC_BuildCancelRequest
  ): Promise<IPC_BuildCancelResponse | IPC_ErrorResponse> {
    try {
      const { jobId } = request;

      if (!jobId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "jobId is required",
        };
      }

      const job = BUILD_JOBS[jobId];
      if (!job) {
        return {
          error: true,
          code: "JOB_NOT_FOUND",
          message: `Job with ID '${jobId}' not found`,
        };
      }

      if (job.status === "cancelled" || job.status === "complete") {
        return {
          error: true,
          code: "INVALID_STATE",
          message: `Cannot cancel job with status '${job.status}'`,
        };
      }

      // Update job
      job.status = "cancelled";
      job.logs.push({
        timestamp: Date.now(),
        level: "warn",
        message: "Build cancelled by user",
        context: "build-cancel",
      });

      console.log(`[IPC] Build job cancelled: ${jobId}`);

      return {
        jobId,
        status: "cancelled",
        message: "Build job has been cancelled",
      };
    } catch (error) {
      console.error("[IPC] Error in build:cancel:", error);
      return {
        error: true,
        code: "CANCEL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle logs request
   */
  static async handleLogs(
    event: IpcMainEvent,
    request: IPC_BuildLogsRequest
  ): Promise<IPC_BuildLogsResponse | IPC_ErrorResponse> {
    try {
      const { jobId, lines = 100, level = "all" } = request;

      if (!jobId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "jobId is required",
        };
      }

      const job = BUILD_JOBS[jobId];
      if (!job) {
        return {
          error: true,
          code: "JOB_NOT_FOUND",
          message: `Job with ID '${jobId}' not found`,
        };
      }

      // Filter logs by level
      let filtered = job.logs;
      if (level !== "all") {
        filtered = filtered.filter((l) => l.level === level);
      }

      // Get last N lines
      const logs = filtered.slice(-lines);

      return {
        jobId,
        logs,
        hasMore: filtered.length > lines,
      };
    } catch (error) {
      console.error("[IPC] Error in build:logs:", error);
      return {
        error: true,
        code: "LOGS_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Simulate build phases for demo purposes
   */
  private static simulateBuildPhases(jobId: string): void {
    const phases: Array<"compiling" | "packaging" | "signing" | "finalizing"> =
      ["compiling", "packaging", "signing", "finalizing"];

    let phaseIndex = 0;
    const phaseInterval = setInterval(() => {
      const job = BUILD_JOBS[jobId];

      if (!job || job.status !== "running") {
        clearInterval(phaseInterval);
        return;
      }

      if (phaseIndex < phases.length) {
        job.phase = phases[phaseIndex];
        job.logs.push({
          timestamp: Date.now(),
          level: "info",
          message: `Build phase: ${job.phase}`,
          context: `build-${job.phase}`,
        });
        phaseIndex++;
      } else {
        // Complete build
        job.status = "complete";
        job.logs.push({
          timestamp: Date.now(),
          level: "info",
          message: "Build completed successfully",
          context: "build-complete",
        });
        clearInterval(phaseInterval);
        console.log(`[IPC] Build job completed: ${jobId}`);
      }
    }, 30000); // Phase every 30 seconds
  }
}

export default BuildIPCHandler;
