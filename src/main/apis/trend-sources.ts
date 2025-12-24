/**
 * Trend Data Source Integration
 *
 * Real-time trend discovery from:
 * - Twitter/X (Trending topics)
 * - TikTok (Trending sounds, hashtags)
 * - Reddit (Trending subreddits, posts)
 * - Google Trends (Search trends)
 */

import { ApiClient, createApiClient } from "./http-client";
import { TrendData, TrendSource, ApiClientConfig } from "./types";

/**
 * Abstract trend source
 */
export abstract class TrendSource {
  abstract source: TrendSource;
  protected client: ApiClient;

  constructor(config: ApiClientConfig) {
    this.client = createApiClient(config);
  }

  /**
   * Fetch trending data
   */
  abstract fetchTrends(limit?: number): Promise<TrendData[]>;

  /**
   * Search for trend
   */
  abstract searchTrend(query: string): Promise<TrendData[]>;
}

/**
 * Twitter/X trend source
 */
export class TwitterTrendSource extends TrendSource {
  source: TrendSource = "twitter";

  constructor(bearerToken: string) {
    super({
      baseUrl: "https://api.twitter.com/2",
      apiKey: bearerToken,
      rateLimitPerSecond: 300,
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
  }

  /**
   * Fetch trending topics
   */
  async fetchTrends(limit: number = 20): Promise<TrendData[]> {
    // Note: Twitter v2 API requires academic research access for trends
    // This is a mock implementation showing the structure
    try {
      const response = await this.client.get<any>("/tweets/search/recent", {
        query: "is:trending",
        max_results: limit,
        "tweet.fields": "public_metrics,created_at",
      });

      return (
        response.data?.map((tweet: any, idx: number) => ({
          id: `twitter-${idx}`,
          source: "twitter" as TrendSource,
          title: tweet.text,
          searchVolume: tweet.public_metrics?.like_count || 0,
          metadata: {
            impressions: tweet.public_metrics?.impression_count,
            retweets: tweet.public_metrics?.retweet_count,
            replies: tweet.public_metrics?.reply_count,
          },
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })) || []
      );
    } catch (error) {
      console.error("Twitter trends fetch failed:", error);
      return [];
    }
  }

  /**
   * Search for trend
   */
  async searchTrend(query: string): Promise<TrendData[]> {
    try {
      const response = await this.client.get<any>("/tweets/search/recent", {
        query,
        max_results: 10,
        "tweet.fields": "public_metrics,created_at",
      });

      return (
        response.data?.map((tweet: any) => ({
          id: `twitter-${tweet.id}`,
          source: "twitter" as TrendSource,
          title: tweet.text,
          searchVolume: tweet.public_metrics?.like_count || 0,
          metadata: {
            impressions: tweet.public_metrics?.impression_count,
            retweets: tweet.public_metrics?.retweet_count,
            replies: tweet.public_metrics?.reply_count,
          },
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })) || []
      );
    } catch (error) {
      console.error("Twitter search failed:", error);
      return [];
    }
  }
}

/**
 * TikTok trend source
 */
export class TikTokTrendSource extends TrendSource {
  source: TrendSource = "tiktok";

  constructor(clientId: string, clientSecret: string) {
    super({
      baseUrl: "https://open.tiktokapis.com/v1",
      apiKey: clientId,
      apiSecret: clientSecret,
      rateLimitPerSecond: 60,
    });
  }

  /**
   * Fetch trending sounds/hashtags
   */
  async fetchTrends(limit: number = 20): Promise<TrendData[]> {
    try {
      const response = await this.client.get<any>(
        "/discovery/hashtag/search/",
        {
          keywords: "trending",
          count: limit,
        }
      );

      return (
        response.hashtag_list?.map((tag: any, idx: number) => ({
          id: `tiktok-${idx}`,
          source: "tiktok" as TrendSource,
          title: `#${tag.name}`,
          searchVolume: tag.view_count || 0,
          metadata: {
            viewCount: tag.view_count,
            videoCount: tag.video_count,
          },
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        })) || []
      );
    } catch (error) {
      console.error("TikTok trends fetch failed:", error);
      return [];
    }
  }

  /**
   * Search for trend
   */
  async searchTrend(query: string): Promise<TrendData[]> {
    try {
      const response = await this.client.get<any>(
        "/discovery/hashtag/search/",
        {
          keywords: query,
          count: 10,
        }
      );

      return (
        response.hashtag_list?.map((tag: any) => ({
          id: `tiktok-${tag.id}`,
          source: "tiktok" as TrendSource,
          title: `#${tag.name}`,
          searchVolume: tag.view_count || 0,
          metadata: {
            viewCount: tag.view_count,
            videoCount: tag.video_count,
          },
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        })) || []
      );
    } catch (error) {
      console.error("TikTok search failed:", error);
      return [];
    }
  }
}

/**
 * Reddit trend source
 */
export class RedditTrendSource extends TrendSource {
  source: TrendSource = "reddit";
  private accessToken: string = "";

  constructor(
    clientId: string,
    clientSecret: string,
    username: string,
    password: string
  ) {
    super({
      baseUrl: "https://www.reddit.com",
      apiKey: clientId,
      apiSecret: clientSecret,
      rateLimitPerSecond: 60,
    });
    this.authenticate(clientId, clientSecret, username, password);
  }

  /**
   * Authenticate with Reddit
   */
  private async authenticate(
    clientId: string,
    clientSecret: string,
    username: string,
    password: string
  ): Promise<void> {
    try {
      const response = await this.client.post<any>(
        "/api/v1/access_token",
        {
          grant_type: "password",
          username,
          password,
        },
        {
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString("base64")}`,
        }
      );

      this.accessToken = response.access_token;
    } catch (error) {
      console.error("Reddit authentication failed:", error);
    }
  }

  /**
   * Fetch trending subreddits
   */
  async fetchTrends(limit: number = 20): Promise<TrendData[]> {
    try {
      if (!this.accessToken) {
        return [];
      }

      const response = await this.client.get<any>(
        "/r/all/hot",
        {
          limit,
        },
        {
          Authorization: `bearer ${this.accessToken}`,
        }
      );

      return (
        response.data?.children
          ?.slice(0, limit)
          .map((item: any, idx: number) => ({
            id: `reddit-${idx}`,
            source: "reddit" as TrendSource,
            title: item.data.title,
            searchVolume: item.data.score || 0,
            growthRate: item.data.upvote_ratio || 0,
            metadata: {
              score: item.data.score,
              comments: item.data.num_comments,
              subreddit: item.data.subreddit,
            },
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
          })) || []
      );
    } catch (error) {
      console.error("Reddit trends fetch failed:", error);
      return [];
    }
  }

  /**
   * Search for trend
   */
  async searchTrend(query: string): Promise<TrendData[]> {
    try {
      if (!this.accessToken) {
        return [];
      }

      const response = await this.client.get<any>(
        "/r/all/search",
        {
          q: query,
          limit: 10,
        },
        {
          Authorization: `bearer ${this.accessToken}`,
        }
      );

      return (
        response.data?.children?.map((item: any) => ({
          id: `reddit-${item.data.id}`,
          source: "reddit" as TrendSource,
          title: item.data.title,
          searchVolume: item.data.score,
          growthRate: item.data.upvote_ratio,
          metadata: {
            score: item.data.score,
            comments: item.data.num_comments,
            subreddit: item.data.subreddit,
          },
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        })) || []
      );
    } catch (error) {
      console.error("Reddit search failed:", error);
      return [];
    }
  }
}

/**
 * Google Trends source
 */
export class GoogleTrendsSource extends TrendSource {
  source: TrendSource = "google-trends";

  constructor(apiKey: string) {
    super({
      baseUrl: "https://trends.google.com/trends/api",
      apiKey,
      rateLimitPerSecond: 100,
    });
  }

  /**
   * Fetch trending searches
   */
  async fetchTrends(limit: number = 20): Promise<TrendData[]> {
    try {
      // Google Trends API is not directly available, using alternative approach
      // This would typically use a third-party service or web scraping
      const response = await fetch(
        "https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=-240&geo=US"
      );

      if (!response.ok) {
        return [];
      }

      const text = await response.text();
      // Remove XSRF protection prefix
      const jsonText = text.replace(/^[^{]*/, "");
      const data = JSON.parse(jsonText);

      return (
        data.default?.timelineData
          ?.slice(0, limit)
          .map((item: any, idx: number) => ({
            id: `google-trends-${idx}`,
            source: "google-trends" as TrendSource,
            title: item.title?.query || "",
            searchVolume: parseInt(item.formattedTraffic || "0", 10),
            metadata: {
              articles: item.articles || [],
            },
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })) || []
      );
    } catch (error) {
      console.error("Google Trends fetch failed:", error);
      return [];
    }
  }

  /**
   * Search for trend
   */
  async searchTrend(query: string): Promise<TrendData[]> {
    try {
      // Search trends over time
      const response = await fetch(
        `https://trends.google.com/trends/api/explore?hl=en-US&q=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        return [];
      }

      const text = await response.text();
      const jsonText = text.replace(/^[^{]*/, "");
      const data = JSON.parse(jsonText);

      return [
        {
          id: `google-trends-${query}`,
          source: "google-trends" as TrendSource,
          title: query,
          searchVolume: 100, // Normalized value
          metadata: data,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      ];
    } catch (error) {
      console.error("Google Trends search failed:", error);
      return [];
    }
  }
}

/**
 * Unified trend manager
 */
export class TrendManager {
  private sources: Map<TrendSource, TrendSource> = new Map();

  /**
   * Register trend source
   */
  registerSource(source: TrendSource): void {
    this.sources.set(source.source, source);
  }

  /**
   * Get trend source
   */
  getSource(source: TrendSource): TrendSource {
    const src = this.sources.get(source);
    if (!src) {
      throw new Error(`Trend source ${source} not registered`);
    }
    return src;
  }

  /**
   * Fetch trends from all sources
   */
  async fetchAllTrends(limit: number = 10): Promise<TrendData[]> {
    const allTrends: TrendData[] = [];

    for (const source of this.sources.values()) {
      try {
        const trends = await source.fetchTrends(limit);
        allTrends.push(...trends);
      } catch (error) {
        console.error(`Failed to fetch from ${source.source}:`, error);
      }
    }

    // Sort by search volume and return top trends
    return allTrends
      .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0))
      .slice(0, limit);
  }

  /**
   * Search trend across sources
   */
  async searchTrendMulti(query: string): Promise<TrendData[]> {
    const results: TrendData[] = [];

    for (const source of this.sources.values()) {
      try {
        const trends = await source.searchTrend(query);
        results.push(...trends);
      } catch (error) {
        console.error(`Failed to search on ${source.source}:`, error);
      }
    }

    return results;
  }

  /**
   * Search trend on specific source
   */
  async searchTrend(source: TrendSource, query: string): Promise<TrendData[]> {
    const src = this.getSource(source);
    return src.searchTrend(query);
  }
}

export {
  TrendSource,
  TwitterTrendSource,
  TikTokTrendSource,
  RedditTrendSource,
  GoogleTrendsSource,
};
