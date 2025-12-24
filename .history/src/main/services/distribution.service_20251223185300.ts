/**
 * Distribution Service - Multi-channel app distribution
 * Handles publishing to Gumroad, Ko-fi, and Itch.io with authentication and sales reporting
 */

import {
  DistributionService,
  DistributionChannel,
  PublishConfig,
  PublishResult,
  SalesReport,
  DateRange,
  SalesMetric,
  SalesTotals,
  PublishedApp,
  ChannelAuth,
} from './types';

/**
 * Mock channel authentication data
 */
const CHANNEL_AUTH: Record<string, ChannelAuth | null> = {
  gumroad: null,
  kofi: null,
  'itch.io': null,
};

/**
 * Mock published apps database
 */
const PUBLISHED_APPS: Map<string, PublishedApp[]> = new Map([
  [
    'gumroad',
    [
      {
        id: 'gum-app-1',
        name: 'Space Colony Lucy',
        version: '1.0.0',
        publishDate: new Date(Date.now() - 30 * 86400000),
        status: 'published',
        revenue: 2450.5,
        downloads: 245,
      },
    ],
  ],
  [
    'kofi',
    [
      {
        id: 'kofi-app-1',
        name: 'Magical Forest Andy',
        version: '1.0.0',
        publishDate: new Date(Date.now() - 45 * 86400000),
        status: 'published',
        revenue: 1800.75,
        downloads: 180,
      },
    ],
  ],
]);

/**
 * Mock sales data for reports
 */
const SALES_DATA: Map<string, SalesMetric[]> = new Map([
  [
    'gumroad',
    [
      { date: new Date(Date.now() - 6 * 86400000), revenue: 150, downloads: 15, purchases: 12, refunds: 1 },
      { date: new Date(Date.now() - 5 * 86400000), revenue: 200, downloads: 20, purchases: 16, refunds: 0 },
      { date: new Date(Date.now() - 4 * 86400000), revenue: 180, downloads: 18, purchases: 14, refunds: 1 },
      { date: new Date(Date.now() - 3 * 86400000), revenue: 220, downloads: 22, purchases: 18, refunds: 0 },
      { date: new Date(Date.now() - 2 * 86400000), revenue: 190, downloads: 19, purchases: 15, refunds: 1 },
      { date: new Date(Date.now() - 1 * 86400000), revenue: 210, downloads: 21, purchases: 17, refunds: 0 },
      { date: new Date(), revenue: 230, downloads: 23, purchases: 19, refunds: 0 },
    ],
  ],
  [
    'kofi',
    [
      { date: new Date(Date.now() - 6 * 86400000), revenue: 120, downloads: 12, purchases: 10, refunds: 0 },
      { date: new Date(Date.now() - 5 * 86400000), revenue: 140, downloads: 14, purchases: 12, refunds: 0 },
      { date: new Date(Date.now() - 4 * 86400000), revenue: 130, downloads: 13, purchases: 11, refunds: 0 },
      { date: new Date(Date.now() - 3 * 86400000), revenue: 160, downloads: 16, purchases: 13, refunds: 1 },
      { date: new Date(Date.now() - 2 * 86400000), revenue: 150, downloads: 15, purchases: 12, refunds: 0 },
      { date: new Date(Date.now() - 1 * 86400000), revenue: 170, downloads: 17, purchases: 14, refunds: 0 },
      { date: new Date(), revenue: 180, downloads: 18, purchases: 15, refunds: 0 },
    ],
  ],
]);

class Distribution implements DistributionService {
  /**
   * Authenticate with a distribution channel
   */
  async authenticateChannel(channel: string, credentials: any): Promise<void> {
    const validChannels = ['gumroad', 'kofi', 'itch.io'];

    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`);
    }

    // Simulate authentication
    if (!credentials.accessToken) {
      throw new Error('Invalid credentials: missing accessToken');
    }

    CHANNEL_AUTH[channel] = {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: new Date(Date.now() + 86400000 * 30), // 30 days
      tokenType: 'Bearer',
    };

    console.log(`[Distribution] Authenticated with ${channel}`);
  }

  /**
   * Check if a channel is connected
   */
  async isChannelConnected(channel: string): Promise<boolean> {
    const auth = CHANNEL_AUTH[channel];
    return auth !== null && auth !== undefined;
  }

  /**
   * Publish app to one or more channels
   */
  async publishApp(
    config: PublishConfig,
    channels: string[]
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const channel of channels) {
      try {
        // Check if authenticated
        if (!(await this.isChannelConnected(channel))) {
          throw new Error(`Not authenticated with ${channel}`);
        }

        // Simulate publishing
        const publishId = `${channel}-pub-${Date.now()}`;
        const url = this.generatePublishUrl(channel, publishId, config.appName);

        // Store published app
        if (!PUBLISHED_APPS.has(channel)) {
          PUBLISHED_APPS.set(channel, []);
        }

        const publishedApp: PublishedApp = {
          id: publishId,
          name: config.appName,
          version: config.appVersion,
          publishDate: new Date(),
          status: 'published',
          revenue: 0,
          downloads: 0,
        };

        PUBLISHED_APPS.get(channel)!.push(publishedApp);

        results.push({
          channel,
          success: true,
          publishId,
          url,
          timestamp: new Date(),
        });

        console.log(
          `[Distribution] Published ${config.appName} to ${channel}: ${url}`
        );
      } catch (error) {
        results.push({
          channel,
          success: false,
          error: (error as Error).message,
          timestamp: new Date(),
        });

        console.error(
          `[Distribution] Failed to publish to ${channel}: ${(error as Error).message}`
        );
      }
    }

    return results;
  }

  /**
   * Unpublish app from a channel
   */
  async unpublishApp(appId: string, channel: string): Promise<void> {
    const apps = PUBLISHED_APPS.get(channel);

    if (!apps) {
      throw new Error(`No apps published to ${channel}`);
    }

    const index = apps.findIndex((a) => a.id === appId);

    if (index === -1) {
      throw new Error(`App not found: ${appId}`);
    }

    apps[index].status = 'unlisted';

    console.log(
      `[Distribution] App unpublished from ${channel}: ${appId}`
    );
  }

  /**
   * Get sales report for an app on a channel
   */
  async getSalesReport(
    appId: string,
    channel: string,
    range: DateRange
  ): Promise<SalesReport> {
    const allSalesData = SALES_DATA.get(channel) || [];

    // Filter by date range
    const filtered = allSalesData.filter(
      (metric) =>
        metric.date >= range.startDate && metric.date <= range.endDate
    );

    // Calculate totals
    const totals: SalesTotals = {
      totalRevenue: 0,
      totalDownloads: 0,
      totalPurchases: 0,
      totalRefunds: 0,
      averageRevenuePerDownload: 0,
    };

    for (const metric of filtered) {
      totals.totalRevenue += metric.revenue;
      totals.totalDownloads += metric.downloads;
      totals.totalPurchases += metric.purchases;
      totals.totalRefunds += metric.refunds;
    }

    if (totals.totalDownloads > 0) {
      totals.averageRevenuePerDownload =
        totals.totalRevenue / totals.totalDownloads;
    }

    return {
      channel,
      period: range,
      sales: filtered,
      totals,
      generatedAt: new Date(),
    };
  }

  /**
   * List published apps on a channel
   */
  async listPublishedApps(channel: string): Promise<PublishedApp[]> {
    const apps = PUBLISHED_APPS.get(channel) || [];
    return JSON.parse(JSON.stringify(apps));
  }

  /**
   * Generate publish URL for a channel
   */
  private generatePublishUrl(
    channel: string,
    publishId: string,
    appName: string
  ): string {
    const encodedName = appName.toLowerCase().replace(/\s+/g, '-');

    switch (channel) {
      case 'gumroad':
        return `https://gumroad.com/${publishId}/${encodedName}`;
      case 'kofi':
        return `https://ko-fi.com/${publishId}/${encodedName}`;
      case 'itch.io':
        return `https://itch.io/games/${encodedName}`;
      default:
        return `https://store.example.com/${publishId}`;
    }
  }

  /**
   * Get distribution overview
   */
  async getDistributionOverview(): Promise<{
    connectedChannels: string[];
    totalPublished: number;
    totalRevenue: number;
    totalDownloads: number;
  }> {
    const connectedChannels = Object.entries(CHANNEL_AUTH)
      .filter(([, auth]) => auth !== null)
      .map(([channel]) => channel);

    let totalPublished = 0;
    let totalRevenue = 0;
    let totalDownloads = 0;

    for (const [, apps] of PUBLISHED_APPS) {
      const publishedApps = apps.filter((a) => a.status === 'published');
      totalPublished += publishedApps.length;
      totalRevenue += publishedApps.reduce((sum, a) => sum + a.revenue, 0);
      totalDownloads += publishedApps.reduce(
        (sum, a) => sum + a.downloads,
        0
      );
    }

    return {
      connectedChannels,
      totalPublished,
      totalRevenue,
      totalDownloads,
    };
  }

  /**
   * Compare performance across channels
   */
  async compareChannelPerformance(range: DateRange): Promise<
    Record<
      string,
      {
        revenue: number;
        downloads: number;
        averageRevenuePerDownload: number;
      }
    >
  > {
    const comparison: Record<
      string,
      {
        revenue: number;
        downloads: number;
        averageRevenuePerDownload: number;
      }
    > = {};

    for (const [channel, salesMetrics] of SALES_DATA) {
      const filtered = salesMetrics.filter(
        (metric) =>
          metric.date >= range.startDate && metric.date <= range.endDate
      );

      const revenue = filtered.reduce((sum, m) => sum + m.revenue, 0);
      const downloads = filtered.reduce((sum, m) => sum + m.downloads, 0);

      comparison[channel] = {
        revenue,
        downloads,
        averageRevenuePerDownload:
          downloads > 0 ? revenue / downloads : 0,
      };
    }

    return comparison;
  }
}

export default new Distribution();
export { Distribution };
