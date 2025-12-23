/**
 * Distribution IPC Handler - Manages app distribution operations
 * Handles publishing, pricing strategies, and sales tracking
 */

import { ipcMain, IpcMainEvent } from "electron";
import {
  IPC_DistributionPublishRequest,
  IPC_DistributionPublishResponse,
  IPC_DistributionPricingRequest,
  IPC_DistributionPricingResponse,
  IPC_DistributionSalesRequest,
  IPC_DistributionSalesResponse,
  IPC_ErrorResponse,
} from "./types";

// Simulated distribution database
const DISTRIBUTION_DATABASE: Record<string, any> = {
  "app-1": {
    appId: "app-1",
    publishedVersions: [
      {
        version: "1.0.0",
        releaseDate: Date.now() - 30 * 86400000,
        channels: {
          "google-play": {
            status: "published",
            url: "https://play.google.com/store/apps/details?id=com.example.app1",
          },
          "app-store": {
            status: "published",
            url: "https://apps.apple.com/app/example-app/id1234567890",
          },
        },
      },
    ],
    pricing: {
      basePrice: 4.99,
      currency: "USD",
      tiers: [
        {
          name: "Free",
          price: 0,
          features: ["Basic animation", "Limited exports"],
        },
        {
          name: "Pro",
          price: 4.99,
          features: [
            "All animations",
            "Unlimited exports",
            "Premium templates",
          ],
        },
        {
          name: "Studio",
          price: 9.99,
          features: ["Everything", "Priority support", "Custom templates"],
        },
      ],
    },
    sales: [],
  },
};

class DistributionIPCHandler {
  /**
   * Register all distribution-related IPC handlers
   */
  static register(): void {
    ipcMain.handle("distribution:publish", this.handlePublish);
    ipcMain.handle("distribution:pricing", this.handlePricing);
    ipcMain.handle("distribution:sales", this.handleSales);

    console.log("[IPC] Distribution handlers registered");
  }

  /**
   * Handle app publishing request
   */
  static async handlePublish(
    event: IpcMainEvent,
    request: IPC_DistributionPublishRequest
  ): Promise<IPC_DistributionPublishResponse | IPC_ErrorResponse> {
    try {
      const { appId, buildJobId, distributionChannels, releaseNotes, version } =
        request;

      // Validation
      if (!appId || !buildJobId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "appId and buildJobId are required",
        };
      }

      if (
        !Array.isArray(distributionChannels) ||
        distributionChannels.length === 0
      ) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "At least one distribution channel must be specified",
        };
      }

      const publishId = `pub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Initialize app record if not exists
      if (!DISTRIBUTION_DATABASE[appId]) {
        DISTRIBUTION_DATABASE[appId] = {
          appId,
          publishedVersions: [],
          pricing: { basePrice: 0, currency: "USD", tiers: [] },
          sales: [],
        };
      }

      // Create publish record
      const channels = distributionChannels.map((channel) => ({
        channel,
        status: "pending" as const,
        url: undefined,
      }));

      const publishRecord = {
        publishId,
        version,
        releaseNotes,
        channels,
        publishedAt: Date.now(),
      };

      DISTRIBUTION_DATABASE[appId].publishedVersions.push(publishRecord);

      console.log(
        `[IPC] Publishing app '${appId}' version ${version} to channels: ${distributionChannels.join(", ")}`
      );

      // Simulate publishing process
      this.simulatePublishing(publishId, appId, channels);

      return {
        publishId,
        appId,
        status: "pending",
        channels,
      };
    } catch (error) {
      console.error("[IPC] Error in distribution:publish:", error);
      return {
        error: true,
        code: "PUBLISH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle pricing configuration request
   */
  static async handlePricing(
    event: IpcMainEvent,
    request: IPC_DistributionPricingRequest
  ): Promise<IPC_DistributionPricingResponse | IPC_ErrorResponse> {
    try {
      const { appId, pricing } = request;

      if (!appId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "appId is required",
        };
      }

      // Validate pricing structure
      if (!pricing || typeof pricing.basePrice !== "number") {
        return {
          error: true,
          code: "INVALID_PRICING",
          message: "Valid pricing structure is required",
        };
      }

      // Initialize or update app record
      if (!DISTRIBUTION_DATABASE[appId]) {
        DISTRIBUTION_DATABASE[appId] = {
          appId,
          publishedVersions: [],
          pricing: { basePrice: 0, currency: "USD", tiers: [] },
          sales: [],
        };
      }

      // Update pricing
      DISTRIBUTION_DATABASE[appId].pricing = pricing;

      console.log(
        `[IPC] Updated pricing for app '${appId}': base price ${pricing.basePrice} ${pricing.currency}`
      );

      // Estimate revenue based on historical data and pricing
      const estimatedRevenue = this.estimateRevenue(appId, pricing);

      return {
        appId,
        pricing,
        estimatedRevenue,
        validUntil: Date.now() + 30 * 86400000, // 30 days validity
      };
    } catch (error) {
      console.error("[IPC] Error in distribution:pricing:", error);
      return {
        error: true,
        code: "PRICING_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle sales data request
   */
  static async handleSales(
    event: IpcMainEvent,
    request: IPC_DistributionSalesRequest
  ): Promise<IPC_DistributionSalesResponse | IPC_ErrorResponse> {
    try {
      const {
        appId,
        startDate = Date.now() - 90 * 86400000,
        endDate = Date.now(),
        aggregateBy = "day",
      } = request;

      if (!appId) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: "appId is required",
        };
      }

      // Get or create app record
      if (!DISTRIBUTION_DATABASE[appId]) {
        DISTRIBUTION_DATABASE[appId] = {
          appId,
          publishedVersions: [],
          pricing: { basePrice: 0, currency: "USD", tiers: [] },
          sales: [],
        };
      }

      const appData = DISTRIBUTION_DATABASE[appId];

      // Generate synthetic sales data if none exists
      if (appData.sales.length === 0) {
        appData.sales = this.generateSalesData(startDate, endDate);
      }

      // Aggregate sales data
      const aggregated = this.aggregateSalesData(
        appData.sales,
        startDate,
        endDate,
        aggregateBy
      );

      // Calculate totals
      const totals = {
        totalRevenue: appData.sales.reduce(
          (sum, s) => sum + (s.revenue || 0),
          0
        ),
        totalDownloads: appData.sales.reduce(
          (sum, s) => sum + (s.downloads || 0),
          0
        ),
        averageRating: 4.2 + Math.random() * 0.7, // 4.2 - 4.9
      };

      return {
        appId,
        sales: aggregated,
        totals,
      };
    } catch (error) {
      console.error("[IPC] Error in distribution:sales:", error);
      return {
        error: true,
        code: "SALES_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Simulate publishing process for a publish job
   */
  private static simulatePublishing(
    publishId: string,
    appId: string,
    channels: any[]
  ): void {
    // Simulate channel publishing with random success
    const publishInterval = setInterval(() => {
      let allPublished = true;
      let anyPending = false;

      for (const channel of channels) {
        if (channel.status === "pending") {
          if (Math.random() > 0.3) {
            // 70% success rate
            channel.status = "published";
            channel.url = this.generateStoreUrl(channel.channel, appId);
          } else {
            channel.status = "in-progress";
            anyPending = true;
          }
        } else if (channel.status === "in-progress") {
          if (Math.random() > 0.4) {
            channel.status = "published";
            channel.url = this.generateStoreUrl(channel.channel, appId);
          } else {
            anyPending = true;
          }
        } else if (channel.status !== "published") {
          allPublished = false;
        }
      }

      if (allPublished || !anyPending) {
        clearInterval(publishInterval);
        console.log(
          `[IPC] Publishing completed for '${publishId}' on app '${appId}'`
        );
      }
    }, 10000); // Update every 10 seconds
  }

  /**
   * Generate store URL for a channel
   */
  private static generateStoreUrl(channel: string, appId: string): string {
    switch (channel) {
      case "google-play":
        return `https://play.google.com/store/apps/details?id=com.doppelganger.${appId}`;
      case "app-store":
        return `https://apps.apple.com/app/doppelganger/id${Math.floor(Math.random() * 999999999)}`;
      default:
        return `https://custom-store.example.com/app/${appId}`;
    }
  }

  /**
   * Estimate revenue based on pricing and market data
   */
  private static estimateRevenue(appId: string, pricing: any): number {
    // Base estimate: 1000 downloads per month at 30% conversion rate
    const monthlyDownloads = 1000;
    const conversionRate = 0.3;
    const basePrice = pricing.basePrice || 4.99;

    return monthlyDownloads * conversionRate * basePrice;
  }

  /**
   * Generate synthetic sales data
   */
  private static generateSalesData(
    startDate: number,
    endDate: number
  ): Array<{
    date: number;
    revenue: number;
    downloads: number;
    transactions: number;
  }> {
    const sales = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      sales.push({
        date: currentDate,
        revenue: Math.floor(Math.random() * 500) + 100,
        downloads: Math.floor(Math.random() * 100) + 20,
        transactions: Math.floor(Math.random() * 30) + 5,
      });

      currentDate += 86400000; // Next day
    }

    return sales;
  }

  /**
   * Aggregate sales data
   */
  private static aggregateSalesData(
    sales: any[],
    startDate: number,
    endDate: number,
    aggregateBy: string
  ): Array<{
    date: number;
    revenue: number;
    downloads: number;
    transactions: number;
  }> {
    const aggregated: Record<number, any> = {};

    for (const sale of sales) {
      if (sale.date >= startDate && sale.date <= endDate) {
        let key = sale.date;

        if (aggregateBy === "week") {
          const date = new Date(sale.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.getTime();
        } else if (aggregateBy === "month") {
          const date = new Date(sale.date);
          key = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
        }

        if (!aggregated[key]) {
          aggregated[key] = {
            date: key,
            revenue: 0,
            downloads: 0,
            transactions: 0,
          };
        }

        aggregated[key].revenue += sale.revenue;
        aggregated[key].downloads += sale.downloads;
        aggregated[key].transactions += sale.transactions;
      }
    }

    return Object.values(aggregated).sort((a, b) => a.date - b.date);
  }
}

export default DistributionIPCHandler;
