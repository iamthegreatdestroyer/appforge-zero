APPFORGE ZERO
AI-Driven Template Morphing Engine
Technical Implementation Specification
Reference: [REF:P1-000]
Version 1.0 | December 2025
 
1. Executive Summary
AppForge Zero employs template morphing—a sub-linear approach where pre-built, proven app architectures are dynamically transformed based on detected market needs. This reduces development complexity from O(n) to O(log n), cutting build time from hours to minutes.
1.1 Core Philosophy
Rather than generating apps from scratch, AppForge Zero morphs existing templates by injecting theme-specific assets, adjusting configurations, and applying AI-generated content. Each template represents a battle-tested architecture that has been optimized for performance, minimal permissions, and offline capability.
1.2 Key Differentiators
•	Template morphing vs. from-scratch generation (O(log n) complexity)
•	Pre-validated architectures ensure store-ready builds
•	AI-assisted asset generation (SDXL via HuggingFace Spaces)
•	Automated trend scanning with PyTrends and Reddit API
•	Zero-cost distribution via Gumroad/Ko-fi/Itch.io
•	GitHub Copilot integration for rapid customization
 
2. Technology Stack
2.1 Desktop Application Layer
Component	Technology
Framework	Electron 28.x + TypeScript 5.3
UI Framework	React 18 + TailwindCSS 3.4 + Zustand
Database	SQLite 3 via better-sqlite3
IPC Layer	Electron IPC with typed channels
2.2 Mobile Build Layer
Component	Technology
Android SDK	API Level 34 (Android 14)
Build System	Gradle 8.4 + Android Gradle Plugin 8.2
Language	Kotlin 1.9.22
UI Toolkit	Jetpack Compose + Material 3
WearOS	Wear Compose 1.3 + Tiles API
2.3 AI & Automation Layer
Component	Technology
Code Assist	GitHub Copilot + Ollama (Code Llama)
Image Generation	SDXL via HuggingFace Spaces (Free)
Trend Analysis	PyTrends + PRAW (Reddit API)
Template Engine	Handlebars.js + Custom Morph Engine
 
3. Complete File Structure
3.1 Project Root
appforge-zero/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── nightly.yml
├── src/
│   ├── main/                    # Electron main process
│   ├── renderer/                # React UI
│   ├── shared/                  # Shared types & constants
│   └── preload/                 # Preload scripts
├── templates/
│   ├── wallpaper-static/
│   ├── wallpaper-live/
│   ├── utility-single/
│   ├── watchface-wearos/
│   └── soundboard/
├── generators/
│   ├── trend_scanner.py
│   ├── asset_generator.py
│   └── build_pipeline.py
├── output/
│   ├── apks/
│   ├── store_assets/
│   └── listings/
├── config/
│   ├── api_keys.yaml
│   ├── templates.yaml
│   └── distribution.yaml
├── scripts/
├── tests/
├── package.json
├── tsconfig.json
├── electron-builder.yml
└── requirements.txt
3.2 Main Process Structure (src/main/)
src/main/
├── index.ts                     # Electron entry point
├── ipc/
│   ├── handlers.ts              # IPC channel handlers
│   ├── template-handlers.ts     # Template-specific handlers
│   ├── build-handlers.ts        # Build process handlers
│   └── channels.ts              # Channel type definitions
├── services/
│   ├── TemplateEngine.ts        # Core morph engine
│   ├── BuildPipeline.ts         # Android build orchestration
│   ├── TrendScanner.ts          # Trend detection service
│   ├── AssetGenerator.ts        # AI asset generation
│   ├── DistributionService.ts   # Multi-channel publishing
│   └── SchedulerService.ts      # Cron-based automation
├── database/
│   ├── schema.ts                # SQLite schema
│   ├── migrations/
│   │   ├── 001_initial.sql
│   │   ├── 002_trends.sql
│   │   └── 003_distributions.sql
│   └── client.ts                # Database client
└── utils/
    ├── python-runner.ts         # Python subprocess manager
    ├── gradle-runner.ts         # Gradle build executor
    ├── file-utils.ts
    └── logger.ts
3.3 Renderer Structure (src/renderer/)
src/renderer/
├── index.tsx                    # React entry point
├── App.tsx                      # Root component
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainContent.tsx
│   ├── templates/
│   │   ├── TemplateCard.tsx
│   │   ├── TemplateGrid.tsx
│   │   └── MorphConfigPanel.tsx
│   ├── trends/
│   │   ├── TrendDashboard.tsx
│   │   ├── TrendCard.tsx
│   │   └── TrendChart.tsx
│   ├── builds/
│   │   ├── BuildQueue.tsx
│   │   ├── BuildProgress.tsx
│   │   └── BuildHistory.tsx
│   └── distribution/
│       ├── ChannelConfig.tsx
│       └── PublishWizard.tsx
├── stores/
│   ├── templateStore.ts
│   ├── buildStore.ts
│   ├── trendStore.ts
│   └── settingsStore.ts
├── hooks/
│   ├── useIPC.ts
│   ├── useTemplates.ts
│   └── useBuild.ts
└── styles/
    └── globals.css
 
4. Template Architecture
4.1 Template Directory Structure
Each template is a complete, buildable Android project with morph points defined in a manifest file.
templates/wallpaper-static/
├── morph.yaml                   # Morph point definitions
├── app/
│   ├── build.gradle.kts
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── kotlin/
│           │   └── com/appforge/wallpaper/
│           │       ├── MainActivity.kt
│           │       ├── WallpaperActivity.kt
│           │       └── utils/
│           └── res/
│               ├── drawable/          # {{MORPH:assets}}
│               ├── values/
│               │   ├── strings.xml    # {{MORPH:strings}}
│               │   ├── colors.xml     # {{MORPH:colors}}
│               │   └── themes.xml
│               └── mipmap-xxxhdpi/    # {{MORPH:icon}}
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
4.2 Morph Manifest (morph.yaml)
# templates/wallpaper-static/morph.yaml
template:
  id: wallpaper-static
  name: Static Wallpaper Pack
  version: 1.0.0
  category: wallpaper
  minBuildTime: 5  # minutes
  maxAssets: 20

morph_points:
  - id: app_name
    type: string
    path: app/src/main/res/values/strings.xml
    pattern: '{{APP_NAME}}'
    required: true

  - id: package_name
    type: string
    paths:
      - app/build.gradle.kts
      - app/src/main/AndroidManifest.xml
      - app/src/main/kotlin/**/*.kt
    pattern: 'com.appforge.wallpaper'
    required: true

  - id: wallpapers
    type: asset_array
    path: app/src/main/res/drawable/
    format: webp
    maxSize: 2048x2048
    minCount: 5
    maxCount: 20

  - id: app_icon
    type: asset
    paths:
      - app/src/main/res/mipmap-mdpi/ic_launcher.webp
      - app/src/main/res/mipmap-hdpi/ic_launcher.webp
      - app/src/main/res/mipmap-xhdpi/ic_launcher.webp
      - app/src/main/res/mipmap-xxhdpi/ic_launcher.webp
      - app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp
    sizes: [48, 72, 96, 144, 192]

  - id: primary_color
    type: color
    path: app/src/main/res/values/colors.xml
    pattern: '{{PRIMARY_COLOR}}'
    default: '#6200EE'

  - id: description
    type: string
    path: app/src/main/res/values/strings.xml
    pattern: '{{APP_DESCRIPTION}}'

validations:
  - type: asset_dimensions
    target: wallpapers
    minWidth: 1080
    minHeight: 1920

  - type: string_length
    target: app_name
    maxLength: 30
 
5. Database Schema
5.1 Migration 001: Initial Schema
File: src/main/database/migrations/001_initial.sql
-- Templates table
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  path TEXT NOT NULL,
  morph_points TEXT,  -- JSON array
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Apps table
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES templates(id),
  name TEXT NOT NULL,
  package_name TEXT UNIQUE NOT NULL,
  version TEXT DEFAULT '1.0.0',
  morph_config TEXT,  -- JSON morph configuration
  status TEXT DEFAULT 'draft',  -- draft, building, built, published
  apk_path TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Assets table
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  app_id TEXT REFERENCES apps(id),
  type TEXT NOT NULL,  -- wallpaper, icon, sound
  path TEXT NOT NULL,
  generation_prompt TEXT,
  metadata TEXT,  -- JSON metadata
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_apps_template ON apps(template_id);
CREATE INDEX idx_apps_status ON apps(status);
CREATE INDEX idx_assets_app ON assets(app_id);
5.2 Migration 002: Trends Schema
File: src/main/database/migrations/002_trends.sql
-- Trends table
CREATE TABLE trends (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL,  -- google, reddit, twitter
  volume INTEGER,
  velocity REAL,  -- Rate of change
  category TEXT,
  captured_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER
);

-- Trend history for velocity calculation
CREATE TABLE trend_history (
  id TEXT PRIMARY KEY,
  trend_id TEXT REFERENCES trends(id),
  volume INTEGER,
  captured_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_trends_keyword ON trends(keyword);
CREATE INDEX idx_trends_source ON trends(source);
CREATE INDEX idx_trends_captured ON trends(captured_at);
5.3 Migration 003: Distribution Schema
File: src/main/database/migrations/003_distributions.sql
-- Distribution channels
CREATE TABLE distribution_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,  -- gumroad, kofi, itchio, direct
  api_key TEXT,
  config TEXT,  -- JSON configuration
  is_active INTEGER DEFAULT 1
);

-- Publications
CREATE TABLE publications (
  id TEXT PRIMARY KEY,
  app_id TEXT REFERENCES apps(id),
  channel_id TEXT REFERENCES distribution_channels(id),
  listing_url TEXT,
  price REAL,
  status TEXT DEFAULT 'draft',  -- draft, pending, live, paused
  published_at INTEGER,
  metadata TEXT  -- JSON (store-specific data)
);

-- Sales tracking
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  publication_id TEXT REFERENCES publications(id),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  platform_fee REAL,
  net_amount REAL,
  sold_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_publications_app ON publications(app_id);
CREATE INDEX idx_sales_publication ON sales(publication_id);
CREATE INDEX idx_sales_date ON sales(sold_at);
 
6. Core Service Interfaces
6.1 Template Engine Service
File: src/main/services/TemplateEngine.ts
import { EventEmitter } from 'events';
import yaml from 'yaml';
import Handlebars from 'handlebars';
import fs from 'fs-extra';
import path from 'path';

export interface MorphPoint {
  id: string;
  type: 'string' | 'color' | 'asset' | 'asset_array';
  path: string | string[];
  pattern?: string;
  required?: boolean;
  default?: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  version: string;
  morphPoints: MorphPoint[];
  path: string;
}

export interface MorphConfig {
  [morphPointId: string]: string | string[];
}

export class TemplateEngine extends EventEmitter {
  private templatesPath: string;
  private templates: Map<string, Template> = new Map();

  constructor(templatesPath: string) {
    super();
    this.templatesPath = templatesPath;
  }

  async loadTemplates(): Promise<void> {
    const dirs = await fs.readdir(this.templatesPath);
    for (const dir of dirs) {
      const morphPath = path.join(this.templatesPath, dir, 'morph.yaml');
      if (await fs.pathExists(morphPath)) {
        const content = await fs.readFile(morphPath, 'utf-8');
        const manifest = yaml.parse(content);
        this.templates.set(manifest.template.id, {
          ...manifest.template,
          morphPoints: manifest.morph_points,
          path: path.join(this.templatesPath, dir)
        });
      }
    }
    this.emit('loaded', this.templates.size);
  }

  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  validateMorphConfig(templateId: string, config: MorphConfig): string[] {
    const template = this.templates.get(templateId);
    if (!template) return ['Template not found'];
    
    const errors: string[] = [];
    for (const point of template.morphPoints) {
      if (point.required && !config[point.id]) {
        errors.push(`Missing required morph point: ${point.id}`);
      }
    }
    return errors;
  }

  async instantiate(
    templateId: string,
    config: MorphConfig,
    outputPath: string
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    // Copy template to output
    await fs.copy(template.path, outputPath);
    this.emit('progress', { stage: 'copied', percent: 20 });

    // Apply morph points
    for (const point of template.morphPoints) {
      await this.applyMorphPoint(outputPath, point, config);
    }
    this.emit('progress', { stage: 'morphed', percent: 80 });

    return outputPath;
  }

  private async applyMorphPoint(
    basePath: string,
    point: MorphPoint,
    config: MorphConfig
  ): Promise<void> {
    const value = config[point.id] || point.default;
    if (!value) return;

    const paths = Array.isArray(point.path) ? point.path : [point.path];
    
    for (const p of paths) {
      const fullPath = path.join(basePath, p);
      
      if (point.type === 'asset' || point.type === 'asset_array') {
        // Copy asset files
        const assets = Array.isArray(value) ? value : [value];
        for (const asset of assets) {
          await fs.copy(asset, fullPath);
        }
      } else {
        // Text replacement
        if (await fs.pathExists(fullPath)) {
          let content = await fs.readFile(fullPath, 'utf-8');
          if (point.pattern) {
            content = content.replace(
              new RegExp(point.pattern, 'g'),
              value as string
            );
          }
          await fs.writeFile(fullPath, content);
        }
      }
    }
  }
}
 
7. Build Pipeline Service
File: src/main/services/BuildPipeline.ts
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';

export interface BuildConfig {
  appId: string;
  projectPath: string;
  outputPath: string;
  buildType: 'debug' | 'release';
  keystorePath?: string;
  keystorePassword?: string;
}

export interface BuildResult {
  success: boolean;
  apkPath?: string;
  duration: number;
  error?: string;
}

export class BuildPipeline extends EventEmitter {
  private androidSdkPath: string;
  private buildQueue: BuildConfig[] = [];
  private isBuilding = false;

  constructor(androidSdkPath: string) {
    super();
    this.androidSdkPath = androidSdkPath;
  }

  async checkPrerequisites(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check Android SDK
    if (!await fs.pathExists(this.androidSdkPath)) {
      errors.push('Android SDK not found');
    }
    
    // Check Java
    try {
      await this.runCommand('java', ['-version']);
    } catch {
      errors.push('Java not found');
    }
    
    return { valid: errors.length === 0, errors };
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      this.emit('started', { appId: config.appId });
      
      // Step 1: Clean previous build
      await this.runGradle(config.projectPath, ['clean']);
      this.emit('progress', { appId: config.appId, stage: 'cleaned', percent: 20 });
      
      // Step 2: Assemble
      const task = config.buildType === 'release' 
        ? 'assembleRelease' 
        : 'assembleDebug';
      await this.runGradle(config.projectPath, [task]);
      this.emit('progress', { appId: config.appId, stage: 'assembled', percent: 70 });
      
      // Step 3: Find APK
      const apkPath = await this.findApk(config.projectPath, config.buildType);
      
      // Step 4: Copy to output
      const outputApk = path.join(
        config.outputPath,
        `${config.appId}-${config.buildType}.apk`
      );
      await fs.copy(apkPath, outputApk);
      this.emit('progress', { appId: config.appId, stage: 'completed', percent: 100 });
      
      return {
        success: true,
        apkPath: outputApk,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runGradle(projectPath: string, args: string[]): Promise<void> {
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    return this.runCommand(gradlew, args, { cwd: projectPath });
  }

  private runCommand(
    cmd: string,
    args: string[],
    options?: { cwd?: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        ...options,
        env: { ...process.env, ANDROID_SDK_ROOT: this.androidSdkPath }
      });
      
      proc.on('close', code => {
        code === 0 ? resolve() : reject(new Error(`Exit code: ${code}`));
      });
    });
  }

  private async findApk(projectPath: string, buildType: string): Promise<string> {
    const apkDir = path.join(
      projectPath,
      'app/build/outputs/apk',
      buildType
    );
    const files = await fs.readdir(apkDir);
    const apk = files.find(f => f.endsWith('.apk'));
    if (!apk) throw new Error('APK not found');
    return path.join(apkDir, apk);
  }
}
 
8. CI/CD Pipelines
8.1 Continuous Integration (ci.yml)
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  build:
    needs: [lint-and-typecheck, test]
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}
          path: dist/
8.2 Release Workflow (release.yml)
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: linux
          - os: windows-latest
            target: win
          - os: macos-latest
            target: mac
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: npm ci
      - run: pip install -r requirements.txt
      - run: npm run build
      - run: npm run package:${{ matrix.target }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
8.3 Nightly Trend Scan (nightly.yml)
name: Nightly Trend Scan

on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - name: Run trend scanner
        run: python generators/trend_scanner.py --output trends.json
        env:
          REDDIT_CLIENT_ID: ${{ secrets.REDDIT_CLIENT_ID }}
          REDDIT_CLIENT_SECRET: ${{ secrets.REDDIT_CLIENT_SECRET }}
      - uses: actions/upload-artifact@v4
        with:
          name: trends-${{ github.run_number }}
          path: trends.json
          retention-days: 30
 
9. Testing Framework
9.1 Vitest Configuration
File: vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts'
      ]
    },
    testTimeout: 30000
  }
});
9.2 Test Categories
•	Unit Tests: Services, utilities, morph engine logic
•	Integration Tests: Database operations, IPC handlers, template loading
•	E2E Tests: Full workflow from template selection to APK generation (Playwright)
 
10. Quick Start Guide
10.1 Prerequisites
•	Node.js 20.x LTS
•	Python 3.11+
•	Android SDK 34 with Build Tools
•	Java 17+ (for Gradle)
•	VS Code with GitHub Copilot extension
10.2 Installation
# Clone repository
git clone https://github.com/yourusername/appforge-zero.git
cd appforge-zero

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Configure API keys
cp config/api_keys.example.yaml config/api_keys.yaml
# Edit config/api_keys.yaml with your Reddit API credentials

# Initialize database
npm run db:migrate

# Start development mode
npm run dev
10.3 First App Generation
1.	Launch AppForge Zero desktop application
2.	Navigate to Templates and select 'Static Wallpaper Pack'
3.	Configure morph points: app name, package name, colors
4.	Generate or import wallpaper assets (5-20 images)
5.	Click 'Build' and wait for APK generation (~5 minutes)
6.	Test APK on device or emulator
7.	Use Distribution wizard to publish to Gumroad
 
11. Revenue Projections
11.1 Conservative Model (Wallpaper Focus)
Metric	Value
Apps per month	10 wallpaper apps
Average price	$1.99
Sales per app/month	50 (niche targeting)
Monthly gross	~$995
Monthly net (after fees)	~$850
Year 1 with compound catalog	$15,000 - $25,000
 
Appendix A: Package Configuration
A.1 package.json
{
  "name": "appforge-zero",
  "version": "1.0.0",
  "description": "AI-Driven Template Morphing Engine",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm:dev:*\"",
    "dev:main": "tsc -w -p tsconfig.main.json",
    "dev:renderer": "vite",
    "dev:electron": "wait-on dist/main/index.js && electron .",
    "build": "tsc -p tsconfig.main.json && vite build",
    "package:win": "electron-builder --win",
    "package:mac": "electron-builder --mac",
    "package:linux": "electron-builder --linux",
    "test": "vitest run",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "db:migrate": "node scripts/migrate.js",
    "trends:scan": "python generators/trend_scanner.py"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "electron-store": "^8.1.0",
    "uuid": "^9.0.1",
    "yaml": "^2.3.4",
    "winston": "^3.11.0",
    "axios": "^1.6.5",
    "handlebars": "^4.7.8",
    "archiver": "^6.0.1",
    "chokidar": "^3.5.3"
  },
  "devDependencies": {
    "electron": "^28.1.0",
    "electron-builder": "^24.9.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "@vitejs/plugin-react": "^4.2.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.1",
    "vitest": "^1.2.1",
    "playwright": "^1.41.1"
  }
}
A.2 requirements.txt
# Trend Analysis
pytrends>=4.9.2
praw>=7.7.1

# Asset Generation
requests>=2.31.0
huggingface-hub>=0.20.2
Pillow>=10.2.0

# Utilities
pyyaml>=6.0.1
python-dotenv>=1.0.0
A.3 tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true,
    "paths": {
      "@shared/*": ["./src/shared/*"],
      "@main/*": ["./src/main/*"],
      "@renderer/*": ["./src/renderer/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
