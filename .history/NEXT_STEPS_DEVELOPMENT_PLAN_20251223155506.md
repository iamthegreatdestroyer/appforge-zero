# Master Class: AppForge Zero Next Steps Development Plan

**Created:** December 23, 2025  
**Foundation Phase:** ✅ COMPLETE  
**Current Status:** Ready for Phase 1 Implementation  
**Total Estimated Duration:** 10-14 weeks | 324 hours  

---

## 🎯 High-Level Overview

AppForge Zero has successfully completed its **Foundation Phase** with all core infrastructure in place:

### ✅ Completed Deliverables
- **Architecture & Setup**: Electron + Vite + React + TypeScript + Zustand
- **E2E Test Suite**: 5 comprehensive Playwright test files (250+ test cases)
- **UI Components**: 6 production-ready page components with full Zustand integration
- **Custom Hooks**: 6 specialized hooks (IPC, Templates, Builds, Trends, Distribution)
- **Constants & Config**: Centralized app configuration, IPC channels, error messages
- **Build System**: Successful production build (308.76 kB) with hot reload dev mode
- **Testing**: Vitest configured with 31/45 tests passing

### 🚀 Next Phase: Implementation Phase (Weeks 1-14)
- Implement missing UI components (Template Grid, Morph Config, Build Progress)
- Build IPC handlers for all channels
- Develop backend services (Template Engine, Build Pipeline, Trend Analyzer)
- Complete system integration and testing
- Polish UI/UX and optimize performance
- Deploy and distribute

---

## 📊 Detailed Phase Breakdown

### **PHASE 1: Component Implementation (Weeks 1-2) | 42 Hours**

#### Goals
- Build reusable, production-grade React components
- Implement all visual elements for pages created in foundation phase
- Ensure E2E tests pass

#### 1.1 Template Management Components (12 Hours)

**TemplateGrid.tsx** - Master template display component
```typescript
// File: src/renderer/components/templates/TemplateGrid.tsx

Features:
- [ ] Responsive grid layout (1-3 columns)
- [ ] Lazy load template thumbnails
- [ ] Click to select, highlight selected
- [ ] Drag-drop reordering
- [ ] Infinite scroll with pagination fallback
- [ ] Loading skeleton states
- [ ] Error boundaries with retry

Props:
  templates: Template[]
  onSelectTemplate: (id: string) => void
  isLoading?: boolean
  error?: Error

Styling:
  - Use Tailwind CSS
  - Support dark/light mode
  - Mobile-first responsive
  - Smooth animations (150-300ms)
```

**TemplateCard.tsx** - Individual template display
```typescript
// File: src/renderer/components/templates/TemplateCard.tsx

Features:
- [ ] Template preview image/thumbnail
- [ ] Template name and category badge
- [ ] Version, author, download count
- [ ] Star rating (1-5)
- [ ] Context menu (Edit, Delete, Duplicate, Export)
- [ ] Selection indicator (checkmark or highlight)
- [ ] Quick stats on hover

Performance:
  - Memoized to prevent unnecessary re-renders
  - Lazy load images with IntersectionObserver
  - Debounce context menu
```

**Test Files to Update:**
- Update E2E: `tests/e2e/templates.spec.ts` lines 45-100

---

#### 1.2 Morph Configuration Components (16 Hours)

**MorphConfigPanel.tsx** - Dynamic form for morph configuration
```typescript
// File: src/renderer/components/templates/MorphConfigPanel.tsx

Features:
- [ ] Generate form based on template morph points
- [ ] Support multiple input types:
    * Text inputs with validation
    * Color picker
    * Image uploader
    * Dropdown/select lists
    * Toggle switches
    * Number inputs with min/max
- [ ] Real-time validation with error messages
- [ ] Preview updates as values change
- [ ] Save/Discard buttons
- [ ] Reset to defaults
- [ ] Undo/Redo support (optional)

State Management:
  - Use separate Zustand store for form state
  - Track dirty/clean state
  - Handle validation errors

Performance:
  - Debounce preview generation (500ms)
  - Memoize form fields
  - Lazy load image previews
```

**MorphPointInput.tsx** - Reusable input component
```typescript
// File: src/renderer/components/templates/MorphPointInput.tsx

Features:
- [ ] Polymorphic input based on type prop
- [ ] Inline validation with error display
- [ ] Label and description
- [ ] Reset button
- [ ] Help text
- [ ] Character/length counter for text inputs

Props:
  type: 'text' | 'color' | 'image' | 'select' | 'toggle' | 'number'
  label: string
  description?: string
  value: any
  onChange: (value: any) => void
  error?: string
  validation?: ValidationRule[]
```

**MorphPreview.tsx** - Real-time preview component
```typescript
// File: src/renderer/components/templates/MorphPreview.tsx

Features:
- [ ] Display morphed template preview
- [ ] Show changes in real-time
- [ ] Zoom controls (50%-200%)
- [ ] Pan functionality
- [ ] Export preview as image
- [ ] Display statistics:
    * File size
    * Asset count
    * Estimated build time

Performance:
  - Cache morph results (5 minutes)
  - Debounce generation (500ms)
  - Use Web Workers for heavy processing
```

**Test Files:**
- Create: `tests/unit/components/MorphConfig.test.tsx` (20+ tests)
- Update: `tests/e2e/templates.spec.ts` with morph config tests

---

#### 1.3 Build Progress Components (14 Hours)

**BuildProgressBar.tsx** - Animated build progress indicator
```typescript
// File: src/renderer/components/build/BuildProgressBar.tsx

Features:
- [ ] Show current phase with label
- [ ] Animated percentage indicator
- [ ] Phase badges (queued, preparing, morphing, compiling, signing)
- [ ] Time estimate and elapsed time
- [ ] Pause/Resume buttons
- [ ] Cancel button
- [ ] Error state with retry

Props:
  jobId: string
  progress: number (0-100)
  phase: BuildPhase
  estimatedTime?: number
  elapsedTime: number
```

**BuildQueueList.tsx** - Manage build queue
```typescript
// File: src/renderer/components/build/BuildQueueList.tsx

Features:
- [ ] Display queue items in order
- [ ] Drag-to-reorder functionality
- [ ] Remove item button
- [ ] Show position in queue
- [ ] Display time estimate
- [ ] Collapse/expand for details
- [ ] Empty state message

Actions:
  - Remove from queue
  - Move up/down in queue
  - View details
  - Cancel (if building)
```

**BuildHistoryTable.tsx** - Paginated history view
```typescript
// File: src/renderer/components/build/BuildHistoryTable.tsx

Features:
- [ ] Table with sortable columns
- [ ] Pagination (20 items per page)
- [ ] Filter by:
    * Status (success, failed, cancelled)
    * Date range
    * Template name
- [ ] Quick actions per row:
    * Retry build
    * Open APK
    * View logs
    * Delete
- [ ] Show build duration and timestamp
- [ ] Status badge (green/red)

Performance:
  - Virtual scrolling for large lists
  - Lazy load details
  - Cache sorting/filtering state
```

**Test Files:**
- Create: `tests/unit/components/BuildProgress.test.tsx`
- Update: `tests/e2e/build.spec.ts` with component tests

---

#### 1.4 Trend Analysis Components (10 Hours)

**TrendChart.tsx** - Visualization of trend data
```typescript
// File: src/renderer/components/trends/TrendChart.tsx

Features:
- [ ] Line chart using recharts library
- [ ] Volume over time visualization
- [ ] Multiple trend overlay comparison
- [ ] Interactive legend
- [ ] Zoom and pan controls
- [ ] Export as PNG/SVG
- [ ] Responsive sizing

Libraries:
  - recharts for charting
  - react-zoom-pan-pinch for pan/zoom

Performance:
  - Limit data points (aggregate if > 1000)
  - Lazy load chart library
  - Memoize chart data
```

**TrendList.tsx** - Filterable trend listing
```typescript
// File: src/renderer/components/trends/TrendList.tsx

Features:
- [ ] Display trends with metadata
- [ ] Trend indicators (↑ up, ↓ down, → stable)
- [ ] Color coding by score (green/yellow/red)
- [ ] Click to view details
- [ ] Favorite/Archive buttons
- [ ] Source badges (Google, Reddit)
- [ ] Sort by volume, velocity, timestamp

Performance:
  - Virtual scroll for 1000+ items
  - Memoize trend rows
  - Debounce search (300ms)
```

**TrendDetail.tsx** - Full trend information panel
```typescript
// File: src/renderer/components/trends/TrendDetail.tsx

Features:
- [ ] Full trend metadata
- [ ] Historical graph
- [ ] Related keywords
- [ ] Suggested templates
- [ ] "Create App" button
- [ ] Confidence score
- [ ] Data sources
- [ ] Prediction curve
```

**Test Files:**
- Create: `tests/unit/components/TrendAnalysis.test.tsx`
- Update: `tests/e2e/trends.spec.ts`

---

### **PHASE 2: IPC Handler Implementation (Weeks 3-5) | 68 Hours**

#### Goals
- Implement all IPC handlers for main ↔ renderer communication
- Ensure type-safe communication
- Full error handling and validation
- Real-time event streaming

#### 2.1 Template IPC Handlers (16 Hours)

**File:** `src/main/ipc/handlers/templateHandlers.ts`

```typescript
// IPC Channels to implement:

ipcMain.handle('templates:list', async () => {
  // Return all templates with metadata
  // Success response: { success: true, data: Template[] }
  // Error response: { success: false, error: IPCError }
})

ipcMain.handle('templates:get', async (event, templateId: string) => {
  // Get specific template by ID with full details
  // Validate templateId is string
  // Return single template or error
})

ipcMain.handle('templates:validate', async (event, { path }: { path: string }) => {
  // Validate template directory structure
  // Check for required files (config.yaml, assets, etc.)
  // Return validation result with errors/warnings
})

ipcMain.handle('templates:instantiate', async (event, { 
  templateId: string
  config: MorphConfig 
}) => {
  // Create app instance from template with morph config
  // Generate unique app ID
  // Store in database
  // Return app metadata
})

ipcMain.handle('templates:preview', async (event, {
  templateId: string
  config: MorphConfig
}) => {
  // Generate morph preview without creating app
  // Return preview image and stats
  // Cache result for 5 minutes
})

ipcMain.handle('templates:createFromTrend', async (event, {
  trendId: string
  templateId: string
  keyword: string
}) => {
  // Create app template from trend keyword
  // Apply keyword as primary theme
  // Return created app instance
})
```

**Test Coverage:**
```typescript
// tests/integration/ipc-handlers/template.test.ts

describe('Template IPC Handlers', () => {
  test('templates:list returns all templates', async () => {
    // Assert: response has success: true
    // Assert: data is array of templates
    // Assert: each template has required fields
    // Performance: < 100ms
  })

  test('templates:get returns specific template', async () => {
    // Assert: returns correct template by ID
    // Assert: includes full config
    // Performance: < 50ms
  })

  test('templates:validate detects invalid templates', async () => {
    // Assert: detects missing files
    // Assert: validates config structure
    // Assert: returns detailed error messages
  })

  test('templates:instantiate creates app correctly', async () => {
    // Assert: unique app ID generated
    // Assert: stored in database
    // Assert: morph config applied
    // Assert: returns app metadata
  })

  test('templates:preview generates preview', async () => {
    // Assert: preview image generated
    // Assert: statistics returned
    // Assert: cached for subsequent calls
  })

  test('templates:createFromTrend sets keyword', async () => {
    // Assert: keyword applied as theme
    // Assert: app created from template
    // Assert: trend association stored
  })
})
```

---

#### 2.2 Build Pipeline IPC Handlers (20 Hours)

**File:** `src/main/ipc/handlers/buildHandlers.ts`

```typescript
ipcMain.handle('builds:create', async (event, { 
  instanceId: string 
}) => {
  // Create new build job
  // Add to queue
  // Return job metadata with jobId
})

ipcMain.handle('builds:queue', async (event) => {
  // Get current queue status
  // Return: { queue: QueueItem[], active: ActiveBuild[] }
})

ipcMain.handle('builds:start', async (event) => {
  // Start next build in queue
  // Emit progress events
  // Return job metadata
})

ipcMain.handle('builds:cancel', async (event, { jobId: string }) => {
  // Cancel specific build
  // Kill any running processes
  // Store result in history
  // Return success
})

ipcMain.handle('builds:history', async (event, {
  limit?: number
  offset?: number
  status?: BuildStatus
  templateId?: string
}) => {
  // Get build history with filters
  // Return paginated results
})

ipcMain.handle('builds:logs', async (event, { 
  jobId: string 
  startLine?: number 
}) => {
  // Stream build logs
  // Return log entries
})

ipcMain.handle('builds:retry', async (event, { resultId: string }) => {
  // Retry failed build
  // Create new job from previous config
  // Add to queue
})

// Events to emit:
ipcMain.emit('builds:progress', {
  jobId: string
  phase: BuildPhase
  progress: number // 0-100
  message: string
  timestamp: number
})

ipcMain.emit('builds:complete', {
  jobId: string
  success: boolean
  apkPath?: string
  error?: string
  duration: number
})
```

**Backend Implementation:** `src/main/services/BuildPipeline.ts`

```typescript
export class BuildPipeline {
  // Properties
  queue: Map<string, QueueJob>
  activeBuilds: Map<string, ActiveBuild>
  db: DatabaseService

  // Methods
  addToQueue(instanceId: string): Promise<QueueJob>
  startNextBuild(): Promise<void>
  cancelBuild(jobId: string): Promise<void>
  retryBuild(resultId: string): Promise<void>
  getQueueStatus(): QueueStatus
  getHistory(filters: HistoryFilters): Promise<BuildResult[]>
  streamLogs(jobId: string): AsyncGenerator<LogLine>

  // Private
  executeBuildPhases(job: QueueJob): Promise<void>
  updateProgress(jobId: string, phase: BuildPhase, progress: number): void
  emitProgress(jobId: string, data: ProgressData): void
}
```

**Sub-service: ApkBuilder** `src/main/services/ApkBuilder.ts`
```typescript
export class ApkBuilder {
  buildApk(projectPath: string, config: BuildConfig): Promise<string>
  getGradleVersion(): Promise<string>
  validateEnvironment(): Promise<void>
}
```

**Sub-service: ApkSigner** `src/main/services/ApkSigner.ts`
```typescript
export class ApkSigner {
  signApk(apkPath: string, keystorePath: string, storePassword: string): Promise<string>
  loadKeystore(path: string): Promise<Keystore>
  verifySignature(apkPath: string): Promise<boolean>
}
```

**Test Coverage:**
```typescript
// tests/integration/ipc-handlers/build.test.ts

describe('Build IPC Handlers', () => {
  test('builds:create adds to queue', async () => {
    // Assert: job added to queue
    // Assert: jobId generated
    // Assert: queue state updated
  })

  test('builds:queue returns correct status', async () => {
    // Assert: returns queue items
    // Assert: returns active builds
    // Assert: order is correct
  })

  test('builds:start processes queue', async () => {
    // Assert: next job starts
    // Assert: progress events emit
    // Assert: build completes
  })

  test('builds:cancel stops build', async () => {
    // Assert: process terminated
    // Assert: result stored
    // Assert: next job starts
  })

  test('builds:history filters correctly', async () => {
    // Assert: filters by status
    // Assert: filters by template
    // Assert: pagination works
  })

  test('builds:retry recreates build', async () => {
    // Assert: new job created
    // Assert: added to queue
    // Assert: same config used
  })
})
```

---

#### 2.3 Trend Scanning IPC Handlers (18 Hours)

**File:** `src/main/ipc/handlers/trendHandlers.ts`

```typescript
ipcMain.handle('trends:scan', async (event, { 
  sources: ('google' | 'reddit')[]
  region?: string
}) => {
  // Initiate trend scan
  // Emit progress events
  // Return scan metadata
})

ipcMain.handle('trends:list', async (event, {
  limit?: number
  offset?: number
  sort?: 'volume' | 'velocity' | 'timestamp'
  filter?: TrendFilter
}) => {
  // Get trends with sorting/filtering
  // Return paginated results
})

ipcMain.handle('trends:get', async (event, { trendId: string }) => {
  // Get specific trend with full details
  // Include historical data
  // Include insights
})

ipcMain.handle('trends:archive', async (event, { trendId: string }) => {
  // Archive trend (hide from list)
  // Don't delete, preserve data
})

ipcMain.handle('trends:delete', async (event, { trendId: string }) => {
  // Permanently delete trend
  // Can be restored from backup only
})

ipcMain.handle('trends:getInsights', async (event, { trendId: string }) => {
  // Get AI-generated insights for trend
  // Return suggestions and opportunities
})

// Events to emit:
ipcMain.emit('trends:scanProgress', {
  source: 'google' | 'reddit'
  progress: number // 0-100
  itemsFound: number
  timestamp: number
})

ipcMain.emit('trends:scanComplete', {
  success: boolean
  totalFound: number
  newTrends: number
  duration: number
  timestamp: number
})

ipcMain.emit('trends:insightGenerated', {
  trendId: string
  insight: Insight
  confidence: number
  timestamp: number
})
```

**Backend Service:** `src/main/services/TrendAnalyzer.ts`

```typescript
export class TrendAnalyzer {
  // Properties
  db: DatabaseService
  googleTrendsAPI: GoogleTrendsAPI
  redditAPI: RedditAPI
  insightGenerator: InsightGenerator

  // Methods
  async scanTrends(sources: string[]): Promise<ScanResult>
  async getTrends(filters: TrendFilter): Promise<Trend[]>
  async getTrendDetails(trendId: string): Promise<TrendDetails>
  async archiveTrend(trendId: string): Promise<void>
  async deleteTrend(trendId: string): Promise<void>
  async generateInsights(trendId: string): Promise<Insight[]>

  // Private
  private aggregateTrends(results: TrendData[]): Trend[]
  private deduplicateTrends(trends: Trend[]): Trend[]
  private scoreTrends(trends: Trend[]): ScoredTrend[]
  private persistTrends(trends: Trend[]): Promise<void>
  private emitProgress(data: ProgressData): void
}
```

**Test Coverage:**
```typescript
// tests/integration/ipc-handlers/trend.test.ts

describe('Trend IPC Handlers', () => {
  test('trends:scan fetches from sources', async () => {
    // Mock Google Trends API
    // Mock Reddit API
    // Assert: data aggregated
    // Assert: deduplication works
  })

  test('trends:list filters and sorts', async () => {
    // Assert: filters applied
    // Assert: sorting correct
    // Assert: pagination works
    // Performance: < 200ms for 1000 items
  })

  test('trends:scanProgress emits regularly', async () => {
    // Assert: progress events emitted
    // Assert: frequency < 500ms
    // Assert: final event on completion
  })

  test('trends:getInsights generates insights', async () => {
    // Assert: Claude API called
    // Assert: valid insights returned
    // Assert: insights cached for 24 hours
  })
})
```

---

#### 2.4 Distribution IPC Handlers (14 Hours)

**File:** `src/main/ipc/handlers/distributionHandlers.ts`

```typescript
ipcMain.handle('distribution:configureChannel', async (event, {
  channelId: string
  config: ChannelConfig
}) => {
  // Save channel configuration
  // Test API credentials
  // Encrypt and store
})

ipcMain.handle('distribution:publish', async (event, {
  appId: string
  channels: string[]
  pricing: PricingConfig
}) => {
  // Publish app to selected channels
  // Emit progress events
  // Return publication IDs
})

ipcMain.handle('distribution:unpublish', async (event, {
  publicationId: string
}) => {
  // Remove app from channel
  // Archive publication record
})

ipcMain.handle('distribution:getSales', async (event, {
  publicationId?: string
  startDate?: Date
  endDate?: Date
}) => {
  // Get sales data from channels
  // Aggregate if multiple publications
  // Return with statistics
})

ipcMain.handle('distribution:getChannelStatus', async (event, {
  channelId: string
}) => {
  // Check channel connectivity
  // Verify API credentials
  // Return status
})

ipcMain.handle('distribution:updatePrice', async (event, {
  publicationId: string
  newPrice: number
}) => {
  // Update app price on channel
  // Sync to all channels
})

// Events to emit:
ipcMain.emit('distribution:publishProgress', {
  publicationId: string
  channel: string
  status: 'uploading' | 'processing' | 'published' | 'failed'
  progress: number
})
```

**Backend Services:**
- `src/main/services/GumroadPublisher.ts`
- `src/main/services/KofiPublisher.ts`
- `src/main/services/ItchioPublisher.ts`

Each publisher implements:
```typescript
export class ChannelPublisher {
  authenticate(credentials: ChannelCredentials): Promise<void>
  publish(app: App, config: PublishConfig): Promise<PublicationID>
  unpublish(publicationId: string): Promise<void>
  getSales(publicationId?: string): Promise<SalesData>
  updatePrice(publicationId: string, price: number): Promise<void>
}
```

---

### **PHASE 3: Service Layer Development (Weeks 6-8) | 90 Hours**

#### Goals
- Implement core business logic
- Complete database integration
- Set up external API integrations

#### 3.1 Template Engine Enhancement (24 Hours)

**File:** `src/main/services/TemplateEngine.ts`

Enhanced features:
```typescript
export class TemplateEngine {
  // Template discovery
  discoverTemplates(directory: string): Promise<Template[]>
  validateTemplate(templatePath: string): Promise<ValidationResult>
  loadTemplate(templateId: string): Promise<Template>
  refreshTemplates(): Promise<void>

  // Caching
  enableCache(ttl: number): void
  clearCache(templateId?: string): void
  getCacheStats(): CacheStats

  // Hot reload (dev mode)
  watchTemplates(directory: string): void
  onTemplateChange(callback: ChangeCallback): void

  // Template versioning
  getVersionHistory(templateId: string): Promise<Version[]>
  rollbackVersion(templateId: string, version: string): Promise<void>

  // Asset management
  getAssets(templateId: string): Promise<Asset[]>
  optimizeAssets(templatePath: string): Promise<void>
}
```

**MorphEngine.ts** (New file)

```typescript
export class MorphEngine {
  // Morph point parsing
  parseMorphPoints(template: Template): MorphPoint[]
  validateMorphConfig(template: Template, config: MorphConfig): ValidationError[]

  // Morphing execution
  applyMorph(
    templatePath: string,
    morphConfig: MorphConfig
  ): Promise<MorphedProject>

  // Preview generation
  generatePreview(
    templatePath: string,
    morphConfig: MorphConfig
  ): Promise<PreviewData>

  // File transformations
  transformTextFile(content: string, config: MorphConfig): string
  transformImageAsset(imagePath: string, config: MorphConfig): Promise<string>
  transformConfigFile(configPath: string, config: MorphConfig): Promise<void>
}
```

---

#### 3.2 Build Pipeline Service (28 Hours)

Comprehensive build management with phases:

```typescript
// Phase: 1. QUEUED → 2. PREPARING → 3. MORPHING → 4. COMPILING → 5. SIGNING → 6. COMPLETE

export class BuildPipeline {
  queue: BuildQueue
  activeBuilds: Map<string, ActiveBuild>
  database: DatabaseService

  // Queue management
  async addToQueue(instanceId: string, priority?: number): Promise<QueueJob>
  async removeFromQueue(jobId: string): Promise<void>
  async reorderQueue(jobId: string, newPosition: number): Promise<void>

  // Build execution
  async startNextBuild(): Promise<void>
  async cancelBuild(jobId: string, reason?: string): Promise<void>
  async pauseBuild(jobId: string): Promise<void>
  async resumeBuild(jobId: string): Promise<void>

  // Phase execution
  private async executePhase(job: QueueJob, phase: BuildPhase): Promise<void>
  private async prepare(job: QueueJob): Promise<void>        // 1-2 min
  private async morph(job: QueueJob): Promise<void>          // 10-20 sec
  private async compile(job: QueueJob): Promise<void>        // 2-4 min
  private async sign(job: QueueJob): Promise<void>           // 5-10 sec

  // History & recovery
  async getHistory(filters: HistoryFilter): Promise<BuildResult[]>
  async retryBuild(resultId: string): Promise<QueueJob>
  async restoreBuildState(): Promise<void>                    // On app startup

  // Monitoring
  getQueueStats(): QueueStats
  getActiveBuilds(): ActiveBuild[]
  streamBuildLogs(jobId: string): AsyncIterable<LogLine>
}
```

**ApkBuilder.ts** (Sub-service)

```typescript
export class ApkBuilder {
  // Environment validation
  async validateEnvironment(): Promise<EnvironmentCheck>
  async getSDKPath(): Promise<string>
  async getNDKPath(): Promise<string>

  // Build execution
  async buildApk(
    projectPath: string,
    config: BuildConfig
  ): Promise<{apkPath: string, buildLog: string}>

  // Build optimization
  setOptimizationLevel(level: 'debug' | 'release'): void
  enableParallelBuild(cores: number): void
  setCacheDir(path: string): void

  // Error handling
  parseBuildErrors(buildLog: string): BuildError[]
}
```

**ApkSigner.ts** (Sub-service)

```typescript
export class ApkSigner {
  // Keystore management
  async loadKeystore(path: string, password: string): Promise<Keystore>
  async createKeystore(path: string, config: KeystoreConfig): Promise<void>
  async listKeys(keystorePath: string): Promise<KeyInfo[]>

  // Signing
  async signApk(
    apkPath: string,
    keystorePath: string,
    keyAlias: string,
    passwords: {store: string, key: string}
  ): Promise<string>

  // Verification
  async verifySignature(apkPath: string): Promise<SignatureInfo>
  async checkExpiration(keystorePath: string): Promise<ExpirationInfo>
}
```

---

#### 3.3 Trend Analysis Service (20 Hours)

```typescript
export class TrendAnalyzer {
  database: DatabaseService
  googleTrends: GoogleTrendsService
  reddit: RedditService
  insightGenerator: InsightGenerator

  // Scanning
  async scanTrends(
    sources: TrendSource[],
    region?: string,
    timeframe?: TimeRange
  ): Promise<ScanResult>

  // Data aggregation
  private aggregateTrends(results: TrendData[]): Trend[]
  private deduplicateTrends(trends: Trend[]): Trend[]
  private calculateTrendScore(trend: RawTrend): number
  private calculateVelocity(trend: Trend, historical: Trend[]): number

  // Querying
  async getTrends(filters: TrendFilter): Promise<Trend[]>
  async getTrendDetails(trendId: string): Promise<TrendDetails>
  async getRelatedKeywords(keyword: string): Promise<string[]>
  async getTrendHistory(trendId: string): Promise<HistoricalData[]>

  // Trend management
  async favoriteTrend(trendId: string): Promise<void>
  async archiveTrend(trendId: string): Promise<void>
  async deleteTrend(trendId: string): Promise<void>

  // Insights
  async generateInsights(trendId: string): Promise<Insight[]>
  async suggestTemplates(trendId: string): Promise<TemplateMatch[]>
  async predictFuture(trendId: string): Promise<Prediction>
}
```

**InsightGenerator.ts** (Sub-service)

```typescript
export class InsightGenerator {
  async generateInsight(trend: Trend): Promise<Insight>
  // Uses Claude API to analyze:
  // - Market opportunity
  // - Competition analysis
  // - Suggested app features
  // - Target audience
  // - Monetization ideas

  // Caching: 24 hours per trend
}
```

---

#### 3.4 Distribution Service (18 Hours)

Base publisher interface:

```typescript
export interface ChannelPublisher {
  authenticate(credentials: ChannelCredentials): Promise<void>
  
  publish(app: App, config: PublishConfig): Promise<string>
  unpublish(publicationId: string): Promise<void>
  update(publicationId: string, updates: PublishUpdate): Promise<void>
  
  getSales(publicationId?: string, dateRange?: DateRange): Promise<SalesData>
  getAnalytics(publicationId: string): Promise<Analytics>
  
  validate(): Promise<HealthStatus>
}
```

**GumroadPublisher.ts**
```typescript
// Gumroad API integration
- Product creation
- APK upload
- License key generation
- Customer management
- Sales webhook integration
```

**KofiPublisher.ts**
```typescript
// Ko-fi API integration
- Tier creation
- Digital product uploads
- Supporter tracking
- Shop management
- Webhook integration
```

**ItchioPublisher.ts**
```typescript
// Itch.io API integration
- Game/app creation
- Build upload
- Rating system
- Community management
- Analytics dashboard
```

---

### **PHASE 4: Testing & Quality Assurance (Weeks 9-10) | 40 Hours**

#### Goals
- Achieve 80%+ test coverage
- All E2E tests passing
- No flaky tests
- Performance benchmarks met

#### 4.1 Unit Test Expansion (16 Hours)

```
Target Coverage:
- Store actions: 95%
- Hook logic: 90%
- Utilities: 85%
- Services: 80%
```

#### 4.2 Integration Tests (12 Hours)

```
New tests for:
- IPC handler integration (200+ tests)
- Service layer integration
- Database operations
- External API mocking
```

#### 4.3 E2E Test Scenarios (12 Hours)

```
Add tests for:
1. Template → Morph → Build → Distribute (complete flow)
2. Trend → Create App → Build
3. Error recovery paths
4. Performance under load
5. Multiple concurrent builds
```

---

### **PHASE 5: UI/UX Polish (Weeks 11) | 32 Hours**

#### 5.1 Visual Polish (12 Hours)
- Design token implementation
- Dark mode toggle
- Micro-interactions
- Accessibility audit
- Responsive design testing

#### 5.2 Error Handling (8 Hours)
- Toast notifications
- Error boundaries
- Retry logic UX
- Helpful error messages

#### 5.3 Documentation (12 Hours)
- User guides
- In-app help system
- API documentation
- Developer guides

---

### **PHASE 6: Performance & Optimization (Week 12) | 30 Hours**

#### 6.1 Frontend (10 Hours)
- Code splitting
- Image optimization
- Bundle analysis
- Memory leak prevention

#### 6.2 Backend (10 Hours)
- Query optimization
- Caching strategy
- API response times
- Process parallelization

#### 6.3 Monitoring (10 Hours)
- Performance metrics
- Error tracking
- Usage analytics
- Health dashboard

---

### **PHASE 7: Deployment & Distribution (Week 13-14) | 22 Hours**

#### 7.1 Electron Packaging (8 Hours)
- electron-builder configuration
- Installers (Windows/Mac/Linux)
- Auto-update system
- Code signing

#### 7.2 Release Pipeline (8 Hours)
- GitHub Actions workflows
- Version management
- Release notes generation
- Beta channel

#### 7.3 Public Distribution (6 Hours)
- Website/landing page
- Software repositories
- Community channels
- Marketing materials

---

## 📈 Success Metrics

### Development Metrics
- ✅ Test coverage ≥ 80%
- ✅ All E2E tests passing
- ✅ Zero critical bugs in main
- ✅ Code review < 24 hours

### Performance Metrics
- ✅ App startup < 2 seconds
- ✅ IPC operations < 100ms
- ✅ Builds < 5 minutes (average)
- ✅ Memory usage < 200MB

### User Metrics
- ✅ Crash rate < 0.1%
- ✅ Feature adoption > 70%
- ✅ User retention > 80%
- ✅ Support response < 24 hours

---

## 🔍 Critical Dependencies & Sequencing

```
Foundation Phase ✓
    ↓
Phase 1: Components (must complete before Phase 2)
    ↓
Phase 2: IPC Handlers (depends on Phase 1)
    ↓
Phase 3: Services (depends on Phase 2)
    ↓
Phase 4: Testing (runs parallel with Phase 3)
    ↓
Phase 5: UI/UX (after Phase 4)
    ↓
Phase 6: Performance (after Phase 5)
    ↓
Phase 7: Deployment (after Phase 6)
```

---

## 📚 Development Guidelines

### Code Quality Standards
```typescript
// ✅ DO:
- Type everything (strict mode)
- Document public APIs
- Write tests for new features
- Handle all error cases
- Validate user input

// ❌ DON'T:
- Use 'any' type
- Ignore TypeScript warnings
- Add code without tests
- Silently fail
- Trust user input
```

### Component Best Practices
```typescript
// ✅ DO:
- Keep components focused
- Use composition
- Extract reusable hooks
- Memoize when needed
- Handle loading/error states

// ❌ DON'T:
- Prop drilling
- Inline styles
- Complex logic in render
- Unnecessary re-renders
```

### Testing Requirements
```typescript
// Each feature must have:
- Unit tests (critical paths)
- Integration tests (system integration)
- E2E tests (user workflows)
- Performance tests (key operations)
- Error case tests
```

---

## 🎯 Weekly Checkpoints

| Week | Focus | Deliverables | Success Criteria |
|------|-------|--------------|-----------------|
| 1-2 | Components | All UI components | E2E tests passing |
| 3-5 | IPC Handlers | All communication | Integration tests |
| 6-8 | Services | All business logic | System integration |
| 9-10 | Testing | Full test coverage | >80% coverage |
| 11 | Polish | UI refinements | No a11y issues |
| 12 | Performance | Optimization | Benchmarks met |
| 13-14 | Deployment | Release ready | Automated deployment |

---

## 🚀 Next Immediate Actions (Next 7 Days)

1. **Review this plan** with team
2. **Create GitHub Project Board** with Phase 1 tasks
3. **Setup CI/CD pipeline** (GitHub Actions)
4. **Begin Phase 1.1** - Template Grid Component
5. **Schedule weekly standups** (Tuesday 10am)
6. **Document architecture decisions** (ADRs)

---

**Created:** December 23, 2025  
**Status:** Ready for Implementation ✓  
**Estimated Completion:** March 2026  
**Total Effort:** 324 hours (10-14 weeks)

