/**
 * Trend IPC Handler - Manages all trend-related operations
 * Handles trend scanning, listing, insights generation, and archiving
 */

import { ipcMain, IpcMainEvent } from "electron";
import {
  IPC_TrendScanRequest,
  IPC_TrendScanResponse,
  IPC_TrendListRequest,
  IPC_TrendListResponse,
  IPC_TrendInsightsRequest,
  IPC_TrendInsightsResponse,
  IPC_TrendArchiveRequest,
  IPC_TrendArchiveResponse,
  IPC_ErrorResponse,
} from "./types";

// Simulated trend database
const TREND_DATABASE: Record<string, any> = {
  "trend-1": {
    id: "trend-1",
    keyword: "AI Animation Studios",
    volume: 450000,
    velocity: 0.85,
    timestamp: Date.now() - 86400000,
    source: "google",
    score: 0.92,
    archived: false,
  },
  "trend-2": {
    id: "trend-2",
    keyword: "Retro TV Show Remakes",
    volume: 320000,
    velocity: 0.72,
    timestamp: Date.now() - 172800000,
    source: "reddit",
    score: 0.88,
    archived: false,
  },
  "trend-3": {
    id: "trend-3",
    keyword: "Interactive Story Apps",
    volume: 280000,
    velocity: 0.65,
    timestamp: Date.now() - 259200000,
    source: "twitter",
    score: 0.81,
    archived: false,
  },
};

const ARCHIVED_TRENDS: string[] = [];

class TrendIPCHandler {
  /**
   * Register all trend-related IPC handlers
   */
  static register(): void {
    ipcMain.handle("trend:scan", this.handleScan);
    ipcMain.handle("trend:list", this.handleList);
    ipcMain.handle("trend:insights", this.handleInsights);
    ipcMain.handle("trend:archive", this.handleArchive);

    console.log("[IPC] Trend handlers registered");
  }

  /**
   * Handle trend scan request
   */
  static async handleScan(
    event: IpcMainEvent,
    request: IPC_TrendScanRequest
  ): Promise<IPC_TrendScanResponse | IPC_ErrorResponse> {
    try {
      const {
        sources = ["google", "reddit", "twitter"],
        categories = [],
        limit = 50,
      } = request;

      // Validation
      if (!Array.isArray(sources) || sources.length === 0) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "At least one data source must be specified",
        };
      }

      const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(
        `[IPC] Starting trend scan: ${scanId} (sources: ${sources.join(", ")})`
      );

      // Simulate scanning process
      const trendsFound = Math.floor(Math.random() * limit) + 10;

      // In a real implementation, this would:
      // 1. Hit external APIs (Google Trends, Reddit API, Twitter API)
      // 2. Process results
      // 3. Score by relevance
      // 4. Store in database
      // 5. Send real-time updates

      setTimeout(() => {
        console.log(
          `[IPC] Trend scan completed: ${scanId} (found ${trendsFound} trends)`
        );
      }, 5000);

      return {
        scanId,
        status: "scanning",
        trendsFound,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[IPC] Error in trend:scan:", error);
      return {
        error: true,
        code: "SCAN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle trend list request
   */
  static async handleList(
    event: IpcMainEvent,
    request: IPC_TrendListRequest
  ): Promise<IPC_TrendListResponse | IPC_ErrorResponse> {
    try {
      const {
        sortBy = "volume",
        sortOrder = "desc",
        filterSource = "all",
        limit = 20,
        offset = 0,
      } = request;

      // Filter trends
      let filtered = Object.values(TREND_DATABASE).filter(
        (t) => !ARCHIVED_TRENDS.includes(t.id)
      );

      if (filterSource !== "all") {
        filtered = filtered.filter((t) => t.source === filterSource);
      }

      // Sort
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "velocity":
            comparison = a.velocity - b.velocity;
            break;
          case "timestamp":
            comparison = a.timestamp - b.timestamp;
            break;
          case "volume":
          default:
            comparison = a.volume - b.volume;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      const total = filtered.length;
      const trends = filtered.slice(offset, offset + limit).map((t) => ({
        id: t.id,
        keyword: t.keyword,
        volume: t.volume,
        velocity: t.velocity,
        timestamp: t.timestamp,
        source: t.source,
        score: t.score,
      }));

      return {
        trends,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("[IPC] Error in trend:list:", error);
      return {
        error: true,
        code: "LIST_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle insights request for a specific trend
   */
  static async handleInsights(
    event: IpcMainEvent,
    request: IPC_TrendInsightsRequest
  ): Promise<IPC_TrendInsightsResponse | IPC_ErrorResponse> {
    try {
      const { trendId } = request;

      if (!trendId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "trendId is required",
        };
      }

      const trend = TREND_DATABASE[trendId];
      if (!trend) {
        return {
          error: true,
          code: "TREND_NOT_FOUND",
          message: `Trend with ID '${trendId}' not found`,
        };
      }

      // Generate insights based on trend data
      const relatedKeywords = this.generateRelatedKeywords(trend.keyword);
      const suggestedApps = this.generateSuggestedApps(trend.keyword);
      const insights = this.generateInsights(
        trend.velocity,
        trend.volume,
        trend.score
      );

      return {
        trendId,
        keyword: trend.keyword,
        volume: trend.volume,
        velocity: trend.velocity,
        confidence: trend.score,
        relatedKeywords,
        suggestedApps,
        insights,
      };
    } catch (error) {
      console.error("[IPC] Error in trend:insights:", error);
      return {
        error: true,
        code: "INSIGHTS_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle trend archiving request
   */
  static async handleArchive(
    event: IpcMainEvent,
    request: IPC_TrendArchiveRequest
  ): Promise<IPC_TrendArchiveResponse | IPC_ErrorResponse> {
    try {
      const { trendIds } = request;

      if (!Array.isArray(trendIds) || trendIds.length === 0) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "trendIds array is required and cannot be empty",
        };
      }

      let archived = 0;
      let failed = 0;

      for (const trendId of trendIds) {
        if (TREND_DATABASE[trendId]) {
          ARCHIVED_TRENDS.push(trendId);
          archived++;
        } else {
          failed++;
        }
      }

      console.log(`[IPC] Archived ${archived} trends, ${failed} not found`);

      return {
        archived,
        failed,
        message: `Successfully archived ${archived} trend(s)`,
      };
    } catch (error) {
      console.error("[IPC] Error in trend:archive:", error);
      return {
        error: true,
        code: "ARCHIVE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate related keywords for a trend
   */
  private static generateRelatedKeywords(keyword: string): string[] {
    const keywordParts = keyword.toLowerCase().split(" ");
    const relatedTerms: Record<string, string[]> = {
      ai: ["machine learning", "neural networks", "deep learning", "nlp"],
      animation: ["motion graphics", "cgi", "3d animation", "digital art"],
      studio: ["production", "creative agency", "media company"],
      app: ["mobile app", "software", "application", "platform"],
      show: ["series", "episode", "television", "streaming"],
      remake: ["reboot", "revival", "reimagining", "adaptation"],
    };

    let related: Set<string> = new Set();
    for (const part of keywordParts) {
      const terms = relatedTerms[part] || [];
      terms.forEach((t) => related.add(t));
    }

    return Array.from(related).slice(0, 8);
  }

  /**
   * Generate suggested apps based on trend
   */
  private static generateSuggestedApps(keyword: string): Array<{
    appName: string;
    score: number;
    templateId?: string;
  }> {
    const apps = [
      {
        appName: "AI Story Generator",
        score: 0.92,
        templateId: "template-1",
      },
      {
        appName: "Retro Remix Creator",
        score: 0.88,
        templateId: "template-2",
      },
      { appName: "Trend Dashboard", score: 0.81 },
    ];

    // Filter based on keyword relevance
    if (keyword.toLowerCase().includes("ai")) {
      return apps.filter((a) => a.appName.includes("AI"));
    }

    return apps;
  }

  /**
   * Generate insights based on trend metrics
   */
  private static generateInsights(
    velocity: number,
    volume: number,
    score: number
  ): Array<{
    type: "opportunity" | "competition" | "growth" | "decline";
    title: string;
    description: string;
  }> {
    const insights = [];

    if (score > 0.85) {
      insights.push({
        type: "opportunity" as const,
        title: "High Confidence Opportunity",
        description:
          "This trend shows strong relevance signals across multiple data sources",
      });
    }

    if (velocity > 0.7) {
      insights.push({
        type: "growth" as const,
        title: "Accelerating Growth",
        description:
          "Search volume is increasing rapidly - now is the time to capitalize",
      });
    }

    if (volume > 300000) {
      insights.push({
        type: "competition" as const,
        title: "High Market Interest",
        description: "Large audience size but expect competitive app landscape",
      });
    }

    if (velocity < 0.4) {
      insights.push({
        type: "decline" as const,
        title: "Declining Interest",
        description: "This trend is losing momentum - consider for archive",
      });
    }

    return insights.length > 0
      ? insights
      : [
          {
            type: "opportunity" as const,
            title: "Emerging Opportunity",
            description:
              "This trend is gaining traction with moderate interest",
          },
        ];
  }
}

export default TrendIPCHandler;
