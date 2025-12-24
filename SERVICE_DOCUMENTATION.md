# Service Layer Documentation

**Complete guide to AppForge Zero services**

---

## Table of Contents

1. [Overview](#overview)
2. [Template Engine](#template-engine)
3. [Morph Engine](#morph-engine)
4. [Build Pipeline](#build-pipeline)
5. [Trend Analyzer](#trend-analyzer)
6. [Distribution Service](#distribution-service)
7. [Service Registry](#service-registry)
8. [Integration Examples](#integration-examples)

---

## Overview

The Service Layer provides core business logic for AppForge Zero:

- **Template Engine** - Manage and validate templates
- **Morph Engine** - Transform content for new contexts
- **Build Pipeline** - Compile apps into APK/AAB formats
- **Trend Analyzer** - Discover market opportunities
- **Distribution Service** - Publish to multiple channels

All services are accessed through the **Service Registry**, a singleton pattern manager.

---

## Template Engine

The Template Engine manages template discovery, validation, and storage.

### Usage

```typescript
import templateEngine from "./services/template.engine";

// Load a template
const template = await templateEngine.loadTemplate("template-1");
console.log(template.title); // 'Space Colony Lucy'

// List templates with filters
const sciFiTemplates = await templateEngine.listTemplates({
  category: "SciFi",
  sortBy: "rating",
  limit: 10,
});

// Search templates
const searchResults = await templateEngine.listTemplates({
  searchQuery: "space",
  limit: 5,
});

// Validate a template
const validation = await templateEngine.validateTemplate({
  title: "New Template",
  description: "A new app template",
  category: "Adventure",
  morphTransformation: {
    characters: {
      hero: {
        originalName: "Original Hero",
        newName: "New Hero",
        traits: ["brave", "clever"],
        personality: { humor: "witty" },
      },
    },
    settings: {
      world: {
        originalSetting: "Kingdom",
        newSetting: "Space Station",
        characteristics: ["advanced", "futuristic"],
      },
    },
    narrative: {},
  },
});

if (validation.valid) {
  console.log("Template is valid!");
} else {
  console.error("Validation errors:", validation.errors);
}

// Save a new template
const templateId = await templateEngine.saveTemplate({
  id: "",
  title: "My Template",
  description: "My custom template",
  category: "Custom",
  createdAt: new Date(),
  updatedAt: new Date(),
  version: "1.0.0",
  metadata: { tags: ["custom", "test"] },
  morphTransformation: {
    /* ... */
  },
  stats: { downloads: 0, rating: 0, reviews: 0 },
});

// Get template statistics
const stats = await templateEngine.getTemplateStats("template-1");
console.log(`Downloads: ${stats.downloads}, Rating: ${stats.rating}`);

// Delete a template
await templateEngine.deleteTemplate("template-id");
```

### Key Methods

| Method                       | Description                  | Returns              |
| ---------------------------- | ---------------------------- | -------------------- |
| `loadTemplate(id)`           | Load a single template       | Template             |
| `listTemplates(filters)`     | List with search/filter/sort | Template[]           |
| `validateTemplate(template)` | Validate template structure  | ValidationResult     |
| `saveTemplate(template)`     | Save new or update template  | string (template ID) |
| `deleteTemplate(id)`         | Delete a template            | void                 |
| `getTemplateStats(id)`       | Get template stats           | Stats object         |
| `updateRating(id, rating)`   | Update template rating       | void                 |

---

## Morph Engine

The Morph Engine transforms content between different contexts.

### Usage

```typescript
import morphEngine from "./services/morph.engine";

// Transform characters
const charMorph = await morphEngine.transformCharacters({
  originalContent: "Lucy is ambitious and loves schemes.",
  morphRules: {
    characters: {
      lucy: {
        originalName: "Lucy",
        newName: "Luna",
        traits: ["ambitious", "clever"],
        personality: { humor: "witty" },
        relationships: { ricky: "commanding officer" },
      },
    },
    settings: {},
    narrative: {},
  },
  context: {
    targetSetting: "Space Station",
    targetEra: "2157",
    tone: "adventurous",
  },
});

console.log(charMorph.transformedContent);
// → "Luna is ambitious and loves schemes."
console.log(charMorph.replacements);
// → [{ original: 'Lucy', replacement: 'Luna', type: 'character', confidence: 0.95 }]

// Transform settings
const settingMorph = await morphEngine.transformSetting({
  originalContent: "The apartment in Manhattan is their home.",
  morphRules: {
    characters: {},
    settings: {
      home: {
        originalSetting: "apartment",
        newSetting: "space station quarters",
        characteristics: ["advanced", "zero-gravity adapted"],
      },
    },
    narrative: {},
  },
  context: {
    targetSetting: "Space Station",
    targetEra: "2157",
    tone: "futuristic",
  },
});

// Transform narrative
const narrativeMorph = await morphEngine.transformNarrative({
  originalContent: "The theme is about marital comedy.",
  morphRules: {
    characters: {},
    settings: {},
    narrative: {
      theme: {
        originalTheme: "marital comedy",
        newTheme: "space exploration adventure",
        tone: "witty yet adventurous",
        conflicts: ["zero-g mishaps", "equipment failures"],
      },
    },
  },
  context: {
    targetSetting: "Space Station",
    targetEra: "2157",
    tone: "adventurous",
  },
});

// Analyze transformation quality
const analysis = await morphEngine.analyzeTransformation(charMorph);
console.log(`Quality Score: ${analysis.score}`);
console.log(`Issues: ${analysis.issues.length}`);
console.log(`Suggestions: ${analysis.suggestions.join(", ")}`);
```

### Key Methods

| Method                          | Description                    | Returns                |
| ------------------------------- | ------------------------------ | ---------------------- |
| `transformCharacters(input)`    | Transform character elements   | MorphOutput            |
| `transformSetting(input)`       | Transform setting elements     | MorphOutput            |
| `transformNarrative(input)`     | Transform narrative elements   | MorphOutput            |
| `analyzeTransformation(output)` | Analyze transformation quality | TransformationAnalysis |

---

## Build Pipeline

The Build Pipeline manages app compilation, signing, and artifact generation.

### Usage

```typescript
import buildPipeline from "./services/build.pipeline";

// Create a build job
const build = await buildPipeline.createBuild("my-app-1", {
  appName: "My Awesome App",
  appVersion: "1.0.0",
  packageName: "com.example.myapp",
  targetFormat: "apk",
  releaseMode: "release",
  optimization: "full",
  signingConfig: {
    keystorePath: "/path/to/keystore.jks",
    keystorePassword: "password",
    keyAlias: "release-key",
    keyPassword: "key-password",
    algorithm: "RSA",
  },
});

console.log(`Build created: ${build.id}`);
console.log(`Status: ${build.status}`); // 'queued'

// Start a build
const started = await buildPipeline.startBuild(build.id);
console.log(`Build started: ${started.status}`); // 'preparing'

// Poll for build progress
let current = await buildPipeline.getBuild(build.id);
while (current.status !== "complete" && current.status !== "failed") {
  console.log(`Progress: ${current.progress}%`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  current = await buildPipeline.getBuild(build.id);
}

if (current.status === "complete") {
  console.log("Build successful!");
  console.log(`Artifacts: ${current.artifacts.length}`);

  // Download artifact
  const artifact = current.artifacts[0];
  const apkBuffer = await buildPipeline.getArtifact(build.id, artifact.id);
  console.log(`Downloaded: ${artifact.name} (${artifact.size} bytes)`);
}

// List builds for an app
const builds = await buildPipeline.listBuilds("my-app-1", {
  status: "complete",
  sortBy: "date",
  limit: 10,
});

// Get build statistics
const stats = await buildPipeline.getBuildStats("my-app-1");
console.log(`Total builds: ${stats.totalBuilds}`);
console.log(
  `Success rate: ${((stats.successfulBuilds / stats.totalBuilds) * 100).toFixed(1)}%`
);
console.log(`Average duration: ${stats.averageDuration}s`);

// Cancel a build
await buildPipeline.cancelBuild(build.id);
```

### Build Phases

1. **Preparing** (5-20%) - Setting up environment
2. **Building** (20-70%) - Compiling code and resources
3. **Signing** (70-90%) - APK signing (release mode only)
4. **Complete** (100%) - Final artifacts ready

### Key Methods

| Method                           | Description            | Returns       |
| -------------------------------- | ---------------------- | ------------- |
| `createBuild(appId, config)`     | Create a build job     | BuildJob      |
| `startBuild(jobId)`              | Start a queued build   | BuildJob      |
| `cancelBuild(jobId)`             | Cancel an active build | void          |
| `getBuild(jobId)`                | Get build status       | BuildJob      |
| `listBuilds(appId, options)`     | List builds for app    | BuildJob[]    |
| `getArtifact(jobId, artifactId)` | Download artifact      | Buffer        |
| `signAPK(path, config)`          | Sign APK               | string (path) |

---

## Trend Analyzer

The Trend Analyzer discovers market opportunities and provides AI insights.

### Usage

```typescript
import trendAnalyzer from "./services/trend.analyzer";

// Scan for trends
const trends = await trendAnalyzer.scan({
  sources: ["google", "reddit", "twitter"],
  categories: ["Technology", "Gaming"],
  limit: 20,
  minVolume: 5000,
});

console.log(`Found ${trends.length} trends`);
trends.forEach((t) => {
  console.log(`- ${t.keyword}: ${t.metrics.volume} searches`);
});

// List trends with filters
const topTrends = await trendAnalyzer.listTrends({
  archived: false,
  sortBy: "growth",
  source: "combined",
  limit: 10,
});

// Analyze a specific trend
const analysis = await trendAnalyzer.analyzeTrend(trends[0].id);

console.log(`Opportunity Score: ${analysis.opportunityScore.toFixed(2)}`);
console.log(`Competition: ${analysis.competitionLevel}`);
console.log(`Market Size: ${analysis.marketSize}`);

// View insights
analysis.insights.forEach((insight) => {
  console.log(`\n${insight.title}`);
  console.log(`Type: ${insight.type}`);
  console.log(`${insight.description}`);
  console.log(`Confidence: ${(insight.confidence * 100).toFixed(0)}%`);
});

// Get app suggestions
console.log("\nSuggested Apps:");
analysis.suggestedApps.forEach((app) => {
  console.log(`- ${app.appName}: ${app.score.toFixed(2)} (${app.rationale})`);
});

// View forecast
const forecast = analysis.forecast;
console.log(`\nForecast: ${forecast.lifespan} trend`);
console.log(`Weekly Growth: ${forecast.weeklyGrowth.toFixed(1)}%`);
console.log(`Monthly Forecast: ${forecast.monthlyForecast.toFixed(1)}%`);
if (forecast.peakDate) {
  console.log(`Peak Date: ${forecast.peakDate.toLocaleDateString()}`);
}

// Generate insights manually
const insights = await trendAnalyzer.generateInsights(trends[0]);

// Suggest apps for trend
const suggestions = await trendAnalyzer.suggestApps(trends[0]);

// Archive a trend
await trendAnalyzer.archiveTrend(trends[0].id);
```

### Opportunity Scoring

Scores range from 0 to 1, based on:

- Search Volume (30%)
- Growth Rate (30%)
- Velocity (25%)
- Sentiment (15%)

**Score Interpretation:**

- 0.8+ : Excellent opportunity
- 0.6-0.8 : Good opportunity
- 0.4-0.6 : Moderate opportunity
- < 0.4 : Limited opportunity

### Key Methods

| Method                    | Description             | Returns         |
| ------------------------- | ----------------------- | --------------- |
| `scan(options)`           | Scan for trends         | Trend[]         |
| `analyzeTrend(id)`        | Detailed trend analysis | TrendAnalysis   |
| `listTrends(filters)`     | List with filtering     | Trend[]         |
| `generateInsights(trend)` | Generate AI insights    | TrendInsight[]  |
| `suggestApps(trend)`      | Suggest app templates   | AppSuggestion[] |
| `archiveTrend(id)`        | Archive a trend         | void            |

---

## Distribution Service

The Distribution Service handles publishing to multiple channels.

### Usage

```typescript
import distribution from "./services/distribution.service";

// Authenticate with a channel
await distribution.authenticateChannel("gumroad", {
  accessToken: "your-access-token",
});

// Verify connection
const connected = await distribution.isChannelConnected("gumroad");
console.log(`Gumroad connected: ${connected}`);

// Publish to one or more channels
const results = await distribution.publishApp(
  {
    appId: "my-app-1",
    appName: "My Awesome App",
    appVersion: "1.0.0",
    description: "An amazing app for everyone",
    releaseNotes: "Initial release with core features",
    price: 4.99,
    currency: "USD",
    category: "Entertainment",
    tags: ["game", "fun", "retro"],
    screenshotsPath: "/path/to/screenshots",
    coverImagePath: "/path/to/cover.jpg",
  },
  ["gumroad", "kofi", "itch.io"]
);

results.forEach((result) => {
  if (result.success) {
    console.log(`✓ Published to ${result.channel}`);
    console.log(`  URL: ${result.url}`);
  } else {
    console.error(`✗ Failed to publish to ${result.channel}: ${result.error}`);
  }
});

// List published apps on a channel
const apps = await distribution.listPublishedApps("gumroad");
apps.forEach((app) => {
  console.log(
    `- ${app.name} v${app.version}: ${app.downloads} downloads, $${app.revenue}`
  );
});

// Get sales report
const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 86400000);

const report = await distribution.getSalesReport("my-app-1", "gumroad", {
  startDate: weekAgo,
  endDate: now,
});

console.log(`\nSales Report (${report.channel})`);
console.log(
  `Period: ${report.period.startDate.toLocaleDateString()} - ${report.period.endDate.toLocaleDateString()}`
);
console.log(`Total Revenue: $${report.totals.totalRevenue.toFixed(2)}`);
console.log(`Total Downloads: ${report.totals.totalDownloads}`);
console.log(
  `Average Revenue per Download: $${report.totals.averageRevenuePerDownload.toFixed(2)}`
);

// Compare channels
const comparison = await distribution.compareChannelPerformance({
  startDate: weekAgo,
  endDate: now,
});

console.log("\nChannel Comparison:");
for (const [channel, metrics] of Object.entries(comparison)) {
  console.log(`${channel}:`);
  console.log(`  Revenue: $${metrics.revenue.toFixed(2)}`);
  console.log(`  Downloads: ${metrics.downloads}`);
  console.log(`  ARPD: $${metrics.averageRevenuePerDownload.toFixed(2)}`);
}

// Unpublish app
await distribution.unpublishApp("my-app-1", "gumroad");
```

### Key Methods

| Method                                  | Description                | Returns           |
| --------------------------------------- | -------------------------- | ----------------- |
| `authenticateChannel(channel, creds)`   | Authenticate with platform | void              |
| `isChannelConnected(channel)`           | Check authentication       | boolean           |
| `publishApp(config, channels)`          | Publish to channels        | PublishResult[]   |
| `unpublishApp(appId, channel)`          | Unpublish an app           | void              |
| `getSalesReport(appId, channel, range)` | Get sales data             | SalesReport       |
| `listPublishedApps(channel)`            | List published apps        | PublishedApp[]    |
| `getDistributionOverview()`             | Overview stats             | Overview object   |
| `compareChannelPerformance(range)`      | Compare channels           | Comparison object |

---

## Service Registry

The Service Registry manages all services through a singleton pattern.

### Usage

```typescript
import { createServiceRegistry, getServiceRegistry } from "./services";

// Initialize (first time only)
const services = createServiceRegistry({
  dataDir: "/path/to/data",
  cacheDir: "/path/to/cache",
  buildDir: "/path/to/builds",
  logDir: "/path/to/logs",
  environment: "production",
});

// Later access (use singleton)
const registry = getServiceRegistry();

// Access individual services
const templates = services.templateEngine;
const builds = services.buildPipeline;
const trends = services.trendAnalyzer;
const distribution = services.distribution;
const morph = services.morphEngine;

// Health check
const health = await registry.checkHealth();
console.log(`Overall Status: ${health.status}`);
health.services.forEach(([name, status]) => {
  console.log(`  ${name}: ${status.status}`);
});

// Get statistics
const stats = await registry.getStatistics();
console.log(`Templates: ${stats.templates.total}`);
console.log(`Trends: ${stats.trends.tracked}`);
console.log(`Distribution: ${stats.distribution.published} apps published`);
```

---

## Integration Examples

### Complete Workflow Example

```typescript
// 1. Find a template
const templates = await services.templateEngine.listTemplates({
  category: "SciFi",
  sortBy: "rating",
});

const template = templates[0];
console.log(`Selected: ${template.title}`);

// 2. Analyze a trend
const trends = await services.trendAnalyzer.scan({
  limit: 1,
  minVolume: 50000,
});

const analysis = await services.trendAnalyzer.analyzeTrend(trends[0].id);
console.log(`Opportunity: ${(analysis.opportunityScore * 100).toFixed(0)}%`);

// 3. Create a build
const build = await services.buildPipeline.createBuild("new-app", {
  appName: `${template.title} - ${trends[0].keyword}`,
  appVersion: "1.0.0",
  packageName: "com.example.newapp",
  targetFormat: "apk",
  releaseMode: "release",
  optimization: "full",
});

console.log(`Build created: ${build.id}`);

// 4. Start build
await services.buildPipeline.startBuild(build.id);
console.log("Build started...");

// 5. Wait for completion
let current = await services.buildPipeline.getBuild(build.id);
while (current.status !== "complete") {
  await new Promise((r) => setTimeout(r, 1000));
  current = await services.buildPipeline.getBuild(build.id);
}

console.log("Build complete!");

// 6. Publish to distribution
const pubResults = await services.distribution.publishApp(
  {
    appId: "new-app",
    appName: `${template.title} - ${trends[0].keyword}`,
    appVersion: "1.0.0",
    description: analysis.insights[0].description,
    releaseNotes: "Initial release",
    price: 2.99,
    currency: "USD",
    category: trends[0].category,
    tags: [trends[0].keyword, template.category],
  },
  ["gumroad", "kofi"]
);

pubResults.forEach((r) => {
  console.log(`✓ Published to ${r.channel}: ${r.url}`);
});

console.log("Workflow complete!");
```

---

## Error Handling

All services throw errors on failure. Use try-catch:

```typescript
try {
  const template = await services.templateEngine.loadTemplate("invalid-id");
} catch (error) {
  console.error("Template loading failed:", (error as Error).message);
  // Handle error
}
```

---

## Best Practices

1. **Initialize Once** - Use Service Registry singleton
2. **Handle Errors** - All service calls should be in try-catch
3. **Validate Input** - Use template validation before saving
4. **Check Health** - Monitor service health periodically
5. **Cache Results** - Store frequently accessed data locally
6. **Log Activities** - Track important operations for debugging

---

## Next Steps

- Phase 4: Connect to real databases
- Phase 5: Integrate with external APIs
- Phase 6: Build React UI components

---

_Service Layer Documentation v1.0_  
_AppForge Zero_
