/**
 * IPC Types - Shared type definitions for all IPC communications
 * Ensures type safety across main and renderer processes
 */

// ============================================================================
// TEMPLATE IPC TYPES
// ============================================================================

export interface IPC_TemplateListRequest {
  category?: string;
  searchQuery?: string;
  sortBy?: 'name' | 'dateAdded' | 'popularity';
  limit?: number;
  offset?: number;
}

export interface IPC_TemplateListResponse {
  templates: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    createdAt: string;
    usageCount: number;
    rating?: number;
  }>;
  total: number;
  hasMore: boolean;
}

export interface IPC_TemplateGetRequest {
  templateId: string;
}

export interface IPC_TemplateGetResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  morphTransformation: {
    characters: Record<string, any>;
    settings: Record<string, any>;
    narrative: Record<string, any>;
  };
  usageCount: number;
  rating?: number;
  previewUrl?: string;
}

export interface IPC_TemplateValidateRequest {
  title: string;
  description: string;
  category: string;
  morphTransformation: {
    characters: Record<string, any>;
    settings: Record<string, any>;
    narrative: Record<string, any>;
  };
}

export interface IPC_TemplateValidateResponse {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface IPC_TemplateInstantiateRequest {
  templateId: string;
  appTitle: string;
  customizations?: Record<string, any>;
}

export interface IPC_TemplateInstantiateResponse {
  jobId: string;
  appId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  timestamp: number;
  estimatedTime?: number;
}

// ============================================================================
// BUILD IPC TYPES
// ============================================================================

export interface IPC_BuildCreateRequest {
  appId: string;
  templateId: string;
  configuration: {
    targetFormat: 'apk' | 'aab' | 'ipa';
    releaseMode: 'debug' | 'release';
    optimization: 'none' | 'basic' | 'full';
  };
}

export interface IPC_BuildCreateResponse {
  jobId: string;
  appId: string;
  status: 'queued';
  queuePosition: number;
  estimatedWaitTime: number;
}

export interface IPC_BuildQueueRequest {
  jobId: string;
}

export interface IPC_BuildQueueResponse {
  jobId: string;
  queuePosition: number;
  totalInQueue: number;
  estimatedWaitTime: number;
}

export interface IPC_BuildStartRequest {
  jobId: string;
}

export interface IPC_BuildStartResponse {
  jobId: string;
  status: 'running';
  phase: 'preparing' | 'compiling' | 'packaging' | 'signing' | 'finalizing';
  startTime: number;
  estimatedCompletionTime: number;
}

export interface IPC_BuildCancelRequest {
  jobId: string;
}

export interface IPC_BuildCancelResponse {
  jobId: string;
  status: 'cancelled';
  message: string;
}

export interface IPC_BuildLogsRequest {
  jobId: string;
  lines?: number;
  level?: 'all' | 'errors' | 'warnings';
}

export interface IPC_BuildLogsResponse {
  jobId: string;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: string;
  }>;
  hasMore: boolean;
}

// ============================================================================
// TREND IPC TYPES
// ============================================================================

export interface IPC_TrendScanRequest {
  sources?: Array<'google' | 'reddit' | 'twitter'>;
  categories?: string[];
  limit?: number;
}

export interface IPC_TrendScanResponse {
  scanId: string;
  status: 'scanning' | 'complete';
  trendsFound: number;
  timestamp: number;
}

export interface IPC_TrendListRequest {
  sortBy?: 'volume' | 'velocity' | 'timestamp';
  sortOrder?: 'asc' | 'desc';
  filterSource?: 'all' | 'google' | 'reddit' | 'twitter';
  limit?: number;
  offset?: number;
}

export interface IPC_TrendListResponse {
  trends: Array<{
    id: string;
    keyword: string;
    volume: number;
    velocity: number;
    timestamp: number;
    source: string;
    score: number;
  }>;
  total: number;
  hasMore: boolean;
}

export interface IPC_TrendInsightsRequest {
  trendId: string;
}

export interface IPC_TrendInsightsResponse {
  trendId: string;
  keyword: string;
  volume: number;
  velocity: number;
  confidence: number;
  relatedKeywords: string[];
  suggestedApps: Array<{
    appName: string;
    score: number;
    templateId?: string;
  }>;
  insights: Array<{
    type: 'opportunity' | 'competition' | 'growth' | 'decline';
    title: string;
    description: string;
  }>;
}

export interface IPC_TrendArchiveRequest {
  trendIds: string[];
}

export interface IPC_TrendArchiveResponse {
  archived: number;
  failed: number;
  message: string;
}

// ============================================================================
// DISTRIBUTION IPC TYPES
// ============================================================================

export interface IPC_DistributionPublishRequest {
  appId: string;
  buildJobId: string;
  distributionChannels: Array<'google-play' | 'app-store' | 'custom'>;
  releaseNotes: string;
  version: string;
}

export interface IPC_DistributionPublishResponse {
  publishId: string;
  appId: string;
  status: 'pending' | 'publishing' | 'published';
  channels: Array<{
    channel: string;
    status: 'pending' | 'in-progress' | 'published' | 'failed';
    url?: string;
  }>;
}

export interface IPC_DistributionPricingRequest {
  appId: string;
  pricing: {
    basePrice: number;
    currency: 'USD' | 'EUR' | 'GBP';
    tiers: Array<{
      name: string;
      price: number;
      features: string[];
    }>;
  };
}

export interface IPC_DistributionPricingResponse {
  appId: string;
  pricing: {
    basePrice: number;
    currency: string;
    tiers: any[];
  };
  estimatedRevenue?: number;
  validUntil: number;
}

export interface IPC_DistributionSalesRequest {
  appId: string;
  startDate?: number;
  endDate?: number;
  aggregateBy?: 'day' | 'week' | 'month';
}

export interface IPC_DistributionSalesResponse {
  appId: string;
  sales: Array<{
    date: number;
    revenue: number;
    downloads: number;
    transactions: number;
  }>;
  totals: {
    totalRevenue: number;
    totalDownloads: number;
    averageRating: number;
  };
}

// ============================================================================
// ERROR RESPONSE TYPE
// ============================================================================

export interface IPC_ErrorResponse {
  error: true;
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Type guard for error responses
export function isIPC_Error(obj: any): obj is IPC_ErrorResponse {
  return obj && obj.error === true && typeof obj.code === 'string';
}
