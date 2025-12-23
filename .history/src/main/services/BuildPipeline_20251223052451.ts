/**
 * BuildPipeline.ts - Android Build Pipeline Service
 * 
 * Handles APK compilation using Gradle with keystore signing support.
 * Emits events for build progress tracking.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build configuration for APK generation
 */
export interface BuildConfig {
  appId: string;
  projectPath: string;
  outputPath: string;
  buildType: 'debug' | 'release';
  keystore?: {
    path: string;
    password: string;
    alias: string;
    keyPassword: string;
  };
  gradleOptions?: string[];
  javaHome?: string;
  androidSdkRoot?: string;
}

/**
 * Result of a build operation
 */
export interface BuildResult {
  success: boolean;
  apkPath?: string;
  buildTime: number;
  errors: string[];
  warnings: string[];
  logs: string[];
}

/**
 * Build prerequisite check result
 */
export interface PrerequisiteCheck {
  valid: boolean;
  androidSdkFound: boolean;
  javaFound: boolean;
  gradleFound: boolean;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BuildPipeline Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages Android APK builds using Gradle
 * 
 * @fires BuildPipeline#build:start - When build begins
 * @fires BuildPipeline#build:progress - Progress updates during build
 * @fires BuildPipeline#build:log - Log output from Gradle
 * @fires BuildPipeline#build:complete - When build completes
 * @fires BuildPipeline#build:error - When build fails
 */
export class BuildPipeline extends EventEmitter {
  private currentProcess: ChildProcess | null = null;
  private defaultAndroidSdkRoot: string;
  private defaultJavaHome: string;

  constructor() {
    super();
    
    // Set default paths based on platform
    if (process.platform === 'win32') {
      this.defaultAndroidSdkRoot = path.join(
        process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local',
        'Android',
        'Sdk'
      );
      this.defaultJavaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Java\\jdk-17';
    } else if (process.platform === 'darwin') {
      this.defaultAndroidSdkRoot = path.join(
        process.env.HOME || '/Users/default',
        'Library',
        'Android',
        'sdk'
      );
      this.defaultJavaHome = process.env.JAVA_HOME || '/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home';
    } else {
      this.defaultAndroidSdkRoot = path.join(
        process.env.HOME || '/home/default',
        'Android',
        'Sdk'
      );
      this.defaultJavaHome = process.env.JAVA_HOME || '/usr/lib/jvm/java-17-openjdk';
    }
  }

  /**
   * Check if all build prerequisites are met
   */
  async checkPrerequisites(config?: Partial<BuildConfig>): Promise<PrerequisiteCheck> {
    const errors: string[] = [];
    
    const androidSdkRoot = config?.androidSdkRoot || 
      process.env.ANDROID_SDK_ROOT || 
      process.env.ANDROID_HOME ||
      this.defaultAndroidSdkRoot;

    const javaHome = config?.javaHome || 
      process.env.JAVA_HOME ||
      this.defaultJavaHome;

    // Check Android SDK
    const androidSdkFound = await fs.pathExists(androidSdkRoot);
    if (!androidSdkFound) {
      errors.push(`Android SDK not found at: ${androidSdkRoot}`);
    } else {
      // Check for required SDK components
      const platformToolsPath = path.join(androidSdkRoot, 'platform-tools');
      const buildToolsPath = path.join(androidSdkRoot, 'build-tools');
      
      if (!await fs.pathExists(platformToolsPath)) {
        errors.push('Android SDK platform-tools not found');
      }
      if (!await fs.pathExists(buildToolsPath)) {
        errors.push('Android SDK build-tools not found');
      }
    }

    // Check Java
    const javaFound = await fs.pathExists(javaHome);
    if (!javaFound) {
      errors.push(`Java not found at: ${javaHome}`);
    }

    // Check Gradle wrapper existence (will be checked per-project)
    const gradleFound = true; // Gradle wrapper is bundled with projects

    return {
      valid: errors.length === 0,
      androidSdkFound,
      javaFound,
      gradleFound,
      errors,
    };
  }

  /**
   * Build an Android APK from a project
   */
  async build(config: BuildConfig): Promise<BuildResult> {
    const startTime = Date.now();
    const result: BuildResult = {
      success: false,
      buildTime: 0,
      errors: [],
      warnings: [],
      logs: [],
    };

    this.emit('build:start', { config });

    try {
      // Check prerequisites
      const prereqs = await this.checkPrerequisites(config);
      if (!prereqs.valid) {
        result.errors.push(...prereqs.errors);
        this.emit('build:error', { errors: prereqs.errors });
        return result;
      }

      // Verify project path exists
      if (!await fs.pathExists(config.projectPath)) {
        const error = `Project path not found: ${config.projectPath}`;
        result.errors.push(error);
        this.emit('build:error', { errors: [error] });
        return result;
      }

      // Check for build.gradle
      const buildGradlePath = path.join(config.projectPath, 'build.gradle');
      const buildGradleKtsPath = path.join(config.projectPath, 'build.gradle.kts');
      
      if (!await fs.pathExists(buildGradlePath) && !await fs.pathExists(buildGradleKtsPath)) {
        const error = 'No build.gradle or build.gradle.kts found in project';
        result.errors.push(error);
        this.emit('build:error', { errors: [error] });
        return result;
      }

      // Configure keystore for release builds
      if (config.buildType === 'release' && config.keystore) {
        await this.configureKeystore(config);
      }

      // Run Gradle build
      const gradleTask = config.buildType === 'debug' 
        ? 'assembleDebug' 
        : 'assembleRelease';

      const gradleArgs = [
        gradleTask,
        '--stacktrace',
        ...(config.gradleOptions || []),
      ];

      this.emit('build:progress', { 
        stage: 'gradle', 
        message: `Running Gradle task: ${gradleTask}` 
      });

      await this.runGradle(config.projectPath, gradleArgs, config);

      // Find the generated APK
      const apkPath = await this.findApk(config.projectPath, config.buildType);
      
      if (apkPath) {
        // Copy APK to output path
        await fs.ensureDir(config.outputPath);
        const outputApkPath = path.join(
          config.outputPath, 
          `${config.appId}-${config.buildType}.apk`
        );
        await fs.copy(apkPath, outputApkPath);

        result.success = true;
        result.apkPath = outputApkPath;
      } else {
        result.errors.push('APK file not found after build');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      this.emit('build:error', { errors: [errorMessage] });
    }

    result.buildTime = Date.now() - startTime;
    
    this.emit('build:complete', { result });
    return result;
  }

  /**
   * Configure keystore for release builds
   */
  private async configureKeystore(config: BuildConfig): Promise<void> {
    if (!config.keystore) return;

    const keystorePropertiesPath = path.join(config.projectPath, 'keystore.properties');
    
    const keystoreProperties = `
storeFile=${config.keystore.path.replace(/\\/g, '\\\\')}
storePassword=${config.keystore.password}
keyAlias=${config.keystore.alias}
keyPassword=${config.keystore.keyPassword}
`.trim();

    await fs.writeFile(keystorePropertiesPath, keystoreProperties, 'utf-8');
  }

  /**
   * Run Gradle wrapper with specified arguments
   */
  private async runGradle(
    projectPath: string, 
    args: string[],
    config: BuildConfig
  ): Promise<void> {
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    
    // Ensure gradlew is executable on Unix systems
    if (process.platform !== 'win32') {
      const gradlewPath = path.join(projectPath, 'gradlew');
      if (await fs.pathExists(gradlewPath)) {
        await fs.chmod(gradlewPath, 0o755);
      }
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ANDROID_SDK_ROOT: config.androidSdkRoot || 
        process.env.ANDROID_SDK_ROOT || 
        process.env.ANDROID_HOME ||
        this.defaultAndroidSdkRoot,
      JAVA_HOME: config.javaHome || 
        process.env.JAVA_HOME ||
        this.defaultJavaHome,
    };

    return this.runCommand(gradlew, args, { 
      cwd: projectPath,
      env,
    });
  }

  /**
   * Run a command and capture output
   */
  private runCommand(
    cmd: string, 
    args: string[], 
    options?: { cwd?: string; env?: NodeJS.ProcessEnv }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentProcess = spawn(cmd, args, {
        cwd: options?.cwd,
        env: options?.env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const line = data.toString();
        stdout += line;
        this.emit('build:log', { type: 'stdout', message: line });
        
        // Parse progress from Gradle output
        if (line.includes('> Task')) {
          this.emit('build:progress', { 
            stage: 'task', 
            message: line.trim() 
          });
        }
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const line = data.toString();
        stderr += line;
        this.emit('build:log', { type: 'stderr', message: line });
      });

      this.currentProcess.on('close', (code: number | null) => {
        this.currentProcess = null;
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with exit code ${code}:\n${stderr}`));
        }
      });

      this.currentProcess.on('error', (error: Error) => {
        this.currentProcess = null;
        reject(error);
      });
    });
  }

  /**
   * Find the generated APK file
   */
  private async findApk(projectPath: string, buildType: string): Promise<string | null> {
    const apkDirs = [
      path.join(projectPath, 'app', 'build', 'outputs', 'apk', buildType),
      path.join(projectPath, 'build', 'outputs', 'apk', buildType),
    ];

    for (const apkDir of apkDirs) {
      if (await fs.pathExists(apkDir)) {
        const files = await fs.readdir(apkDir);
        const apkFile = files.find(f => f.endsWith('.apk') && !f.includes('unsigned'));
        
        if (apkFile) {
          return path.join(apkDir, apkFile);
        }
      }
    }

    return null;
  }

  /**
   * Cancel the current build process
   */
  cancelBuild(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      this.emit('build:cancelled');
      return true;
    }
    return false;
  }

  /**
   * Clean build artifacts from a project
   */
  async clean(projectPath: string): Promise<void> {
    const buildDir = path.join(projectPath, 'build');
    const appBuildDir = path.join(projectPath, 'app', 'build');

    if (await fs.pathExists(buildDir)) {
      await fs.remove(buildDir);
    }

    if (await fs.pathExists(appBuildDir)) {
      await fs.remove(appBuildDir);
    }

    this.emit('build:cleaned', { projectPath });
  }

  /**
   * Get build information for a project
   */
  async getBuildInfo(projectPath: string): Promise<{
    hasGradleWrapper: boolean;
    buildGradleType: 'groovy' | 'kotlin' | null;
    modules: string[];
  }> {
    const gradlewPath = path.join(projectPath, 'gradlew');
    const gradlewBatPath = path.join(projectPath, 'gradlew.bat');
    const buildGradlePath = path.join(projectPath, 'build.gradle');
    const buildGradleKtsPath = path.join(projectPath, 'build.gradle.kts');
    const settingsGradlePath = path.join(projectPath, 'settings.gradle');
    const settingsGradleKtsPath = path.join(projectPath, 'settings.gradle.kts');

    const hasGradleWrapper = 
      await fs.pathExists(gradlewPath) || 
      await fs.pathExists(gradlewBatPath);

    let buildGradleType: 'groovy' | 'kotlin' | null = null;
    if (await fs.pathExists(buildGradleKtsPath)) {
      buildGradleType = 'kotlin';
    } else if (await fs.pathExists(buildGradlePath)) {
      buildGradleType = 'groovy';
    }

    // Parse modules from settings.gradle
    const modules: string[] = [];
    const settingsPath = await fs.pathExists(settingsGradleKtsPath) 
      ? settingsGradleKtsPath 
      : settingsGradlePath;

    if (await fs.pathExists(settingsPath)) {
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      const includeMatches = settingsContent.matchAll(/include\s*[("']([^"']+)[)"']/g);
      
      for (const match of includeMatches) {
        modules.push(match[1].replace(':', ''));
      }
    }

    return {
      hasGradleWrapper,
      buildGradleType,
      modules,
    };
  }
}

export default BuildPipeline;
