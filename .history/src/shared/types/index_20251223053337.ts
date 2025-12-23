/**
 * AppForge Zero - Shared Type Definitions
 * 
 * Central type definitions shared between main and renderer processes.
 * These types define the core data structures used throughout the application.
 */

// =============================================================================
// Template Types
// =============================================================================

export interface MorphPoint {
  key: string;
  label: string;
  type: 'text' | 'color' | 'image' | 'list' | 'boolean' | 'number';
  default: string | boolean | number | string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    required?: boolean;
  };
  description?: string;
}

export interface TemplateMorphConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  category: TemplateCategory;
  morphPoints: MorphPoint[];
  assets: {
    icon: string;
    screenshots: string[];
  };
  build: {
    minSdk: number;
    targetSdk: number;
    compileSdk: number;
  };
}

export type TemplateCategory = 
  | 'wallpaper-pack'
  | 'quote-cards'
  | 'sound-boards'
  | 'ringtone-pack'
  | 'icon-pack'
  | 'widget-pack'
  | 'utility'
  | 'entertainment';

export interface Template {
  id: string;
  path: string;
  config: TemplateMorphConfig;
  status: 'valid' | 'invalid' | 'loading';
  lastLoaded: Date;
}

// =============================================================================
// App/Project Types
// =============================================================================

export type AppStatus = 
  | 'draft'
  | 'morphing'
  | 'building'
  | 'ready'
  | 'published'
  | 'failed'
  | 'archived';

export interface MorphValue {
  key: string;
  value: string | boolean | number | string[];
}

export interface AppProject {
  id: string;
  name: string;
  packageName: string;
  templateId: string;
  templateCategory: TemplateCategory;
  morphValues: MorphValue[];
  status: AppStatus;
  apkPath?: string;
  iconPath?: string;
  createdAt: Date;
  updatedAt: Date;
  buildHistory: BuildRecord[];
}

export interface BuildRecord {
  id: string;
  appId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  logs: string[];
  apkPath?: string;
  apkSize?: number;
  errorMessage?: string;
  gradleVersion?: string;
}

// =============================================================================
// Trend Types
// =============================================================================

export type TrendSource = 'reddit' | 'google_trends' | 'app_store' | 'manual';

export interface Trend {
  id: string;
  keyword: string;
  source: TrendSource;
  score: number;
  velocity: number; // Rate of change in popularity
  firstSeen: Date;
  lastUpdated: Date;
  suggestedCategory?: TemplateCategory;
  relatedKeywords: string[];
  metadata: Record<string, unknown>;
}

export interface TrendAnalysis {
  timestamp: Date;
  topTrends: Trend[];
  emergingTrends: Trend[];
  decliningTrends: Trend[];
  categoryBreakdown: Record<TemplateCategory, number>;
}

// =============================================================================
// Distribution Types
// =============================================================================

export type DistributionChannel = 
  | 'google_play'
  | 'amazon_appstore'
  | 'samsung_galaxy_store'
  | 'direct_download';

export type DistributionStatus = 
  | 'pending'
  | 'uploading'
  | 'review'
  | 'published'
  | 'rejected'
  | 'suspended';

export interface Distribution {
  id: string;
  appId: string;
  channel: DistributionChannel;
  status: DistributionStatus;
  storeUrl?: string;
  uploadedAt?: Date;
  publishedAt?: Date;
  rejectionReason?: string;
  downloads: number;
  revenue: number;
  rating?: number;
  reviewCount?: number;
}

// =============================================================================
// Build Pipeline Types
// =============================================================================

export interface BuildConfig {
  appId: string;
  outputDir: string;
  debugBuild: boolean;
  signConfig?: SigningConfig;
  optimizations: {
    minify: boolean;
    shrinkResources: boolean;
    enableR8: boolean;
  };
}

export interface SigningConfig {
  keystorePath: string;
  keystorePassword: string;
  keyAlias: string;
  keyPassword: string;
}

export interface BuildProgress {
  buildId: string;
  stage: BuildStage;
  progress: number; // 0-100
  currentTask: string;
  estimatedTimeRemaining?: number; // seconds
}

export type BuildStage = 
  | 'preparing'
  | 'morphing'
  | 'compiling'
  | 'packaging'
  | 'signing'
  | 'optimizing'
  | 'complete'
  | 'failed';

// =============================================================================
// IPC Communication Types
// =============================================================================

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Template IPC Channels
export interface TemplateIPCChannels {
  'template:list': () => Promise<IPCResponse<Template[]>>;
  'template:get': (id: string) => Promise<IPCResponse<Template>>;
  'template:refresh': () => Promise<IPCResponse<void>>;
  'template:validate': (path: string) => Promise<IPCResponse<boolean>>;
}

// App IPC Channels
export interface AppIPCChannels {
  'app:create': (data: Partial<AppProject>) => Promise<IPCResponse<AppProject>>;
  'app:list': () => Promise<IPCResponse<AppProject[]>>;
  'app:get': (id: string) => Promise<IPCResponse<AppProject>>;
  'app:update': (id: string, data: Partial<AppProject>) => Promise<IPCResponse<AppProject>>;
  'app:delete': (id: string) => Promise<IPCResponse<void>>;
  'app:morph': (id: string, values: MorphValue[]) => Promise<IPCResponse<void>>;
}

// Build IPC Channels
export interface BuildIPCChannels {
  'build:start': (config: BuildConfig) => Promise<IPCResponse<BuildRecord>>;
  'build:cancel': (buildId: string) => Promise<IPCResponse<void>>;
  'build:status': (buildId: string) => Promise<IPCResponse<BuildProgress>>;
  'build:logs': (buildId: string) => Promise<IPCResponse<string[]>>;
}

// Trend IPC Channels
export interface TrendIPCChannels {
  'trend:scan': () => Promise<IPCResponse<TrendAnalysis>>;
  'trend:list': () => Promise<IPCResponse<Trend[]>>;
  'trend:suggest': (category: TemplateCategory) => Promise<IPCResponse<Trend[]>>;
}

// =============================================================================
// Settings Types
// =============================================================================

export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    autoUpdate: boolean;
    telemetry: boolean;
  };
  android: {
    sdkPath: string;
    gradlePath?: string;
    javaHome?: string;
    defaultMinSdk: number;
    defaultTargetSdk: number;
  };
  build: {
    parallelBuilds: number;
    cacheEnabled: boolean;
    cacheMaxSize: number; // MB
    outputDirectory: string;
  };
  distribution: {
    googlePlayCredentials?: string;
    amazonCredentials?: string;
    samsungCredentials?: string;
  };
  trends: {
    enabled: boolean;
    scanInterval: number; // hours
    redditEnabled: boolean;
    googleTrendsEnabled: boolean;
  };
}

// =============================================================================
// UI State Types
// =============================================================================

export interface UIState {
  currentView: 'dashboard' | 'templates' | 'apps' | 'trends' | 'settings';
  selectedTemplateId?: string;
  selectedAppId?: string;
  sidebarCollapsed: boolean;
  modals: {
    createApp: boolean;
    settings: boolean;
    buildProgress: boolean;
    confirmDelete: boolean;
  };
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    handler: string;
  };
}

// =============================================================================
// Export All Types
// =============================================================================

export type {
  MorphPoint,
  TemplateMorphConfig,
  Template,
  TemplateCategory,
  AppProject,
  AppStatus,
  MorphValue,
  BuildRecord,
  BuildConfig,
  BuildProgress,
  BuildStage,
  SigningConfig,
  Trend,
  TrendSource,
  TrendAnalysis,
  Distribution,
  DistributionChannel,
  DistributionStatus,
  IPCResponse,
  AppSettings,
  UIState,
  Notification,
};
