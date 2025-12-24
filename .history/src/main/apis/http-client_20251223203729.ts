/**
 * HTTP Client with Retry Logic and Rate Limiting
 *
 * Production-ready HTTP client supporting:
 * - Exponential backoff retries
 * - Rate limiting (token bucket algorithm)
 * - Request/response logging
 * - Error handling and classification
 * - Configurable timeouts
 */

import {
  HttpRequest,
  HttpResponse,
  ApiClientConfig,
  RetryPolicy,
  RateLimitConfig,
  ApiErrorDetails,
  RateLimitInfo,
} from "./types";

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefillTime: number;

  constructor(config: RateLimitConfig) {
    this.maxTokens = config.requestsPerSecond;
    this.tokens = this.maxTokens;
    this.refillRate = config.requestsPerSecond / 1000; // per ms
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Try to consume tokens
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available
   */
  async wait(tokens: number = 1): Promise<void> {
    while (!this.tryConsume(tokens)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Get time to next token
   */
  getWaitTimeMs(tokens: number = 1): number {
    this.refill();

    if (this.tokens >= tokens) {
      return 0;
    }

    const tokensNeeded = tokens - this.tokens;
    return tokensNeeded / this.refillRate;
  }
}

/**
 * API Client with built-in retry and rate limiting
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;
  private retryPolicy: RetryPolicy;
  private rateLimiter: TokenBucket;
  private requestLog: Array<{
    timestamp: Date;
    url: string;
    method: string;
    statusCode?: number;
    error?: string;
  }> = [];

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      rateLimitPerSecond: config.rateLimitPerSecond || 10,
      userAgent: config.userAgent || "AppForge-Zero/1.0",
      headers: config.headers || {},
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || "",
      apiSecret: config.apiSecret || "",
    };

    this.retryPolicy = {
      maxAttempts: this.config.retryAttempts,
      delayMs: this.config.retryDelayMs,
      backoffMultiplier: 2,
      maxDelayMs: 60000, // 1 minute max
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    };

    this.rateLimiter = new TokenBucket({
      requestsPerSecond: this.config.rateLimitPerSecond,
    });
  }

  /**
   * Make HTTP request with retries and rate limiting
   */
  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    // Apply rate limiting
    await this.rateLimiter.wait();

    // Build full URL
    const url = this.buildUrl(req.url, req.query);

    // Build headers
    const headers = this.buildHeaders(req.headers);

    // Retry loop
    let lastError: Error | null = null;
    let lastResponse: HttpResponse<T> | null = null;

    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt++) {
      try {
        // Make the request
        const response = await this.makeRequest<T>({
          ...req,
          url,
          headers,
        });

        this.log({
          timestamp: new Date(),
          url,
          method: req.method,
          statusCode: response.status,
        });

        // Check if retryable error
        if (!this.isRetryableStatus(response.status)) {
          return response;
        }

        lastResponse = response;

        // Last attempt - return response
        if (attempt === this.retryPolicy.maxAttempts) {
          return response;
        }

        // Wait before retry
        const delayMs = this.getRetryDelayMs(attempt);
        console.warn(
          `[ApiClient] Attempt ${attempt} returned ${response.status}, ` +
            `retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        lastError = error as Error;

        this.log({
          timestamp: new Date(),
          url,
          method: req.method,
          error: lastError.message,
        });

        // Last attempt - throw error
        if (attempt === this.retryPolicy.maxAttempts) {
          throw this.classifyError(lastError, url);
        }

        // Wait before retry
        const delayMs = this.getRetryDelayMs(attempt);
        console.warn(
          `[ApiClient] Attempt ${attempt} failed: ${lastError.message}, ` +
            `retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Should not reach here, but fallback
    if (lastResponse) {
      return lastResponse;
    }

    throw lastError || new Error("Request failed");
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    url: string,
    query?: Record<string, string | number | boolean>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>({
      method: "GET",
      url,
      query,
      headers,
    });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>({
      method: "POST",
      url,
      body,
      headers,
    });
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>({
      method: "PUT",
      url,
      body,
      headers,
    });
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>({
      method: "DELETE",
      url,
      headers,
    });
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>({
      method: "PATCH",
      url,
      body,
      headers,
    });
    return response.data;
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): RateLimitInfo {
    const waitTimeMs = this.rateLimiter.getWaitTimeMs();
    return {
      limit: this.config.rateLimitPerSecond,
      remaining: Math.floor(this.config.rateLimitPerSecond),
      resetAt: new Date(Date.now() + waitTimeMs),
      retryAfterMs: waitTimeMs > 0 ? waitTimeMs : undefined,
    };
  }

  /**
   * Get request logs
   */
  getLogs() {
    return [...this.requestLog];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.requestLog = [];
  }

  /**
   * Build full URL
   */
  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean>
  ): string {
    let url = path.startsWith("http") ? path : `${this.config.baseUrl}${path}`;

    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join("&");
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Build request headers
   */
  private buildHeaders(
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": this.config.userAgent,
      "Content-Type": "application/json",
      ...this.config.headers,
      ...customHeaders,
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Make actual HTTP request (fetch wrapper)
   */
  private async makeRequest<T = unknown>(
    req: HttpRequest
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let data: T;

      try {
        data = JSON.parse(rawBody) as T;
      } catch {
        data = rawBody as T;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        data,
        rawBody,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return this.retryPolicy.retryableStatusCodes.includes(status);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelayMs(attempt: number): number {
    const exponentialDelay =
      this.retryPolicy.delayMs *
      Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1);

    const delay = Math.min(exponentialDelay, this.retryPolicy.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();

    return delay + jitter;
  }

  /**
   * Classify error and create ApiErrorDetails
   */
  private classifyError(error: Error, url: string): ApiErrorDetails {
    const message = error.message;

    if (message.includes("timeout")) {
      return {
        statusCode: 408,
        message: "Request timeout",
        code: "TIMEOUT",
        retryable: true,
      };
    }

    if (message.includes("network")) {
      return {
        statusCode: 0,
        message: "Network error",
        code: "NETWORK_ERROR",
        retryable: true,
      };
    }

    return {
      statusCode: 0,
      message,
      retryable: false,
    };
  }

  /**
   * Log request
   */
  private log(entry: any): void {
    this.requestLog.push(entry);

    // Keep only last 1000 entries
    if (this.requestLog.length > 1000) {
      this.requestLog.shift();
    }
  }
}

/**
 * Create API client instance
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
