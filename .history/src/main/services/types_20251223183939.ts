/**
 * Service Types - Shared type definitions for all services
 * Defines interfaces for Template Engine, Build Pipeline, Trend Analyzer, and Distribution
 */

// ============================================================================
// TEMPLATE ENGINE TYPES
// ============================================================================

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  metadata: {
    author?: string;
    tags?: string[];
    compatibility?: string[];
  };
  morphTransformation: MorphTransformation;
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
  };
  filePath?: string;
}

export interface MorphTransformation {
  characters: Record<string, CharacterMorph>;
  settings: Record<string, SettingMorph>;
  narrative: Record<string, NarrativeMorph>;
}

export interface CharacterMorph {
  originalName: string;
  newName: string;
  traits: string[];
  personality: Record<string, string>;
  relationships: Record<string, string>;
  archetype?: string;
}

export interface SettingMorph {
  originalSetting: string;
  newSetting: string;
  era?: string;
  characteristics: string[];
  environment?: string;
}

export interface NarrativeMorph {
  originalTheme: string;
  newTheme: string;
  tone: string;
  conflicts: string[];
  resolution?: string;
}

export interface TemplateEngineService {
  loadTemplate(templateId: string): Promise<Template>;
  listTemplates(filters: TemplateFilters): Promise<Template[]>;
  validateTemplate(template: Partial<Template>): Promise<ValidationResult>;
  saveTemplate(template: Template): Promise<string>;
  deleteTemplate(templateId: string): Promise<void>;
}

export interface TemplateFilters {
  category?: string;
  searchQuery?: string;
  sortBy?: 'name' | 'rating' | 'downloads' | 'recent';
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

// ============================================================================
// MORPH ENGINE TYPES
// ============================================================================

export interface MorphInput {
  originalContent: string;
  morphRules: MorphTransformation;
  context: MorphContext;
}

export interface MorphContext {
  targetSetting: string;
  targetEra: string;
  tone: string;
  style?: string;
}

export interface MorphOutput {
  transformedContent: string;
  replacements: MorphReplacement[];
  metadata: MorphMetadata;
}

export interface MorphReplacement {
  original: string;
  replacement: string;
  type: 'character' | 'setting' | 'narrative' | 'expression';
  confidence: number;
}

export interface MorphMetadata {
  transformationScore: number;
  preservedElements: string[];
  alteredElements: string[];
  estimatedQuality: number;
}

export interface MorphEngineService {
  transformCharacters(input: MorphInput): Promise<MorphOutput>;
  transformSetting(input: MorphInput): Promise<MorphOutput>;
  transformNarrative(input: MorphInput): Promise<MorphOutput>;
  analyzeTransformation(output: MorphOutput): Promise<TransformationAnalysis>;
}

export interface TransformationAnalysis {
  score: number;
  preservationRatio: number;
  originalityScore: number;
  issues: TransformationIssue[];
  suggestions: string[];
}

export interface TransformationIssue {
  type: 'consistency' | 'plausibility' | 'quality';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// BUILD PIPELINE TYPES
// ============================================================================

export interface BuildJob {
  id: string;
  appId: string;
  templateId: string;
  status: BuildStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  configuration: BuildConfiguration;
  artifacts: BuildArtifact[];
  logs: BuildLog[];
  error?: BuildError;
}

export type BuildStatus = 'queued' | 'preparing' | 'building' | 'signing' | 'complete' | 'failed' | 'cancelled';

export interface BuildConfiguration {
  appName: string;
  appVersion: string;
  packageName: string;
  targetFormat: 'apk' | 'aab' | 'ipa';
  releaseMode: 'debug' | 'release';
  optimization: 'none' | 'basic' | 'full';
  signingConfig?: SigningConfig;
}

export interface SigningConfig {
  keystorePath: string;
  keystorePassword: string;
  keyAlias: string;
  keyPassword: string;
  algorithm: 'RSA' | 'DSA' | 'EC';
}

export interface BuildArtifact {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  checksum: string;
  createdAt: Date;
}

export interface BuildLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: string;
}

export interface BuildError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

export interface BuildPipelineService {
  createBuild(appId: string, config: BuildConfiguration): Promise<BuildJob>;
  startBuild(jobId: string): Promise<BuildJob>;
  cancelBuild(jobId: string): Promise<void>;
  getBuild(jobId: string): Promise<BuildJob>;
  listBuilds(appId: string, options?: ListBuildOptions): Promise<BuildJob[]>;
  getArtifact(jobId: string, artifactId: string): Promise<Buffer>;
  signAPK(apkPath: string, signingConfig: SigningConfig): Promise<string>;
}

export interface ListBuildOptions {
  status?: BuildStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'status' | 'duration';
}

// ============================================================================
// TREND ANALYZER TYPES
// ============================================================================

export interface Trend {
  id: string;
  keyword: string;
  category: string;
  source: 'google' | 'reddit' | 'twitter' | 'combined';
  metrics: TrendMetrics;
  discoveredAt: Date;
  archived: boolean;
  analysis?: TrendAnalysis;
}

export interface TrendMetrics {
  volume: number;
  velocity: number;
  growth: number;
  sentiment: number; // -1 to 1
  confidence: number;
  sources: Record<string, number>;
}

export interface TrendAnalysis {
  opportunityScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  marketSize: 'niche' | 'moderate' | 'large';
  insights: TrendInsight[];
  suggestedApps: AppSuggestion[];
  relatedKeywords: string[];
  forecast: TrendForecast;
}

export interface TrendInsight {
  type: 'opportunity' | 'threat' | 'pattern' | 'emerging';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export interface AppSuggestion {
  appName: string;
  templateId: string;
  score: number;
  rationale: string;
}

export interface TrendForecast {
  weeklyGrowth: number;
  monthlyForecast: number;
  peakDate?: Date;
  declineDate?: Date;
  lifespan: 'short' | 'medium' | 'long';
}

export interface TrendAnalyzerService {
  scan(options: ScanOptions): Promise<Trend[]>;
  analyzeTrend(trendId: string): Promise<TrendAnalysis>;
  listTrends(filters: TrendFilters): Promise<Trend[]>;
  archiveTrend(trendId: string): Promise<void>;
  generateInsights(trend: Trend): Promise<TrendInsight[]>;
  suggestApps(trend: Trend): Promise<AppSuggestion[]>;
}

export interface ScanOptions {
  sources?: Array<'google' | 'reddit' | 'twitter'>;
  categories?: string[];
  limit?: number;
  minVolume?: number;
}

export interface TrendFilters {
  archived?: boolean;
  sortBy?: 'volume' | 'velocity' | 'growth' | 'recent';
  source?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// DISTRIBUTION SERVICE TYPES
// ============================================================================

export interface DistributionChannel {
  name: 'gumroad' | 'kofi' | 'itch.io';
  connected: boolean;
  authentication?: ChannelAuth;
  settings?: Record<string, any>;
}

export interface ChannelAuth {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
}

export interface PublishConfig {
  appId: string;
  appName: string;
  appVersion: string;
  description: string;
  releaseNotes: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  screenshotsPath?: string;
  coverImagePath?: string;
}

export interface PublishResult {
  channel: string;
  success: boolean;
  publishId?: string;
  url?: string;
  error?: string;
  timestamp: Date;
}

export interface SalesReport {
  channel: string;
  period: DateRange;
  sales: SalesMetric[];
  totals: SalesTotals;
  generatedAt: Date;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SalesMetric {
  date: Date;
  revenue: number;
  downloads: number;
  purchases: number;
  refunds: number;
}

export interface SalesTotals {
  totalRevenue: number;
  totalDownloads: number;
  totalPurchases: number;
  totalRefunds: number;
  averageRevenuePerDownload: number;
}

export interface DistributionService {
  authenticateChannel(channel: string, credentials: any): Promise<void>;
  isChannelConnected(channel: string): Promise<boolean>;
  publishApp(config: PublishConfig, channels: string[]): Promise<PublishResult[]>;
  unpublishApp(appId: string, channel: string): Promise<void>;
  getSalesReport(appId: string, channel: string, range: DateRange): Promise<SalesReport>;
  listPublishedApps(channel: string): Promise<PublishedApp[]>;
}

export interface PublishedApp {
  id: string;
  name: string;
  version: string;
  publishDate: Date;
  status: 'draft' | 'published' | 'unlisted';
  revenue: number;
  downloads: number;
}

// ============================================================================
// SERVICE CONTAINER TYPES
// ============================================================================

export interface ServiceContainer {
  templateEngine: TemplateEngineService;
  morphEngine: MorphEngineService;
  buildPipeline: BuildPipelineService;
  trendAnalyzer: TrendAnalyzerService;
  distribution: DistributionService;
}

export interface ServiceConfig {
  dataDir: string;
  cacheDir: string;
  buildDir: string;
  logDir: string;
  environment: 'development' | 'production' | 'test';
}
