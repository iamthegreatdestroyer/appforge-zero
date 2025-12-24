/**
 * Build Pipeline Service - Complete app build pipeline with APK generation and signing
 * Manages build jobs, compilation, signing, and artifact management
 */

import {
  BuildJob,
  BuildPipelineService,
  BuildConfiguration,
  BuildStatus,
  BuildArtifact,
  BuildLog,
  BuildError,
  SigningConfig,
  ListBuildOptions,
} from './types';

/**
 * In-memory build database
 * In production, would use SQLite/PostgreSQL
 */
const BUILD_DATABASE: Map<string, BuildJob> = new Map();

class BuildPipeline implements BuildPipelineService {
  private buildQueue: string[] = [];
  private activeBuild: string | null = null;

  /**
   * Create a new build job
   */
  async createBuild(
    appId: string,
    config: BuildConfiguration
  ): Promise<BuildJob> {
    const jobId = `build-${Date.now()}`;

    const build: BuildJob = {
      id: jobId,
      appId,
      templateId: '', // Set by caller
      status: 'queued',
      progress: 0,
      configuration: config,
      artifacts: [],
      logs: [],
    };

    BUILD_DATABASE.set(jobId, build);
    this.buildQueue.push(jobId);

    this.log(jobId, 'info', 'Build job created and queued');

    return build;
  }

  /**
   * Start a queued build job
   */
  async startBuild(jobId: string): Promise<BuildJob> {
    const build = BUILD_DATABASE.get(jobId);

    if (!build) {
      throw new Error(`Build not found: ${jobId}`);
    }

    if (build.status !== 'queued') {
      throw new Error(`Cannot start build with status: ${build.status}`);
    }

    if (this.activeBuild) {
      throw new Error(`Build already in progress: ${this.activeBuild}`);
    }

    this.activeBuild = jobId;
    build.status = 'preparing';
    build.startTime = new Date();
    build.progress = 5;

    this.log(jobId, 'info', 'Build started: Preparing environment');

    // Simulate build phases
    this.simulateBuildPhases(jobId);

    return build;
  }

  /**
   * Cancel an active build
   */
  async cancelBuild(jobId: string): Promise<void> {
    const build = BUILD_DATABASE.get(jobId);

    if (!build) {
      throw new Error(`Build not found: ${jobId}`);
    }

    if (build.status === 'complete' || build.status === 'failed') {
      throw new Error(`Cannot cancel completed build: ${jobId}`);
    }

    build.status = 'cancelled';
    build.endTime = new Date();
    this.activeBuild = null;

    this.log(jobId, 'warn', 'Build cancelled by user');
  }

  /**
   * Get a build job
   */
  async getBuild(jobId: string): Promise<BuildJob> {
    const build = BUILD_DATABASE.get(jobId);

    if (!build) {
      throw new Error(`Build not found: ${jobId}`);
    }

    return JSON.parse(JSON.stringify(build));
  }

  /**
   * List builds for an app
   */
  async listBuilds(
    appId: string,
    options?: ListBuildOptions
  ): Promise<BuildJob[]> {
    const { status, limit = 10, offset = 0, sortBy = 'date' } = options || {};

    let builds = Array.from(BUILD_DATABASE.values()).filter(
      (b) => b.appId === appId
    );

    // Filter by status
    if (status) {
      builds = builds.filter((b) => b.status === status);
    }

    // Sort
    builds.sort((a, b) => {
      switch (sortBy) {
        case 'status':
          return a.status.localeCompare(b.status);
        case 'duration':
          const durationA = (a.endTime || new Date()).getTime() - (a.startTime || new Date()).getTime();
          const durationB = (b.endTime || new Date()).getTime() - (b.startTime || new Date()).getTime();
          return durationB - durationA;
        case 'date':
        default:
          return (b.startTime || b.endTime || new Date()).getTime() - (a.startTime || a.endTime || new Date()).getTime();
      }
    });

    // Paginate
    return builds.slice(offset, offset + limit);
  }

  /**
   * Get an artifact from a build
   */
  async getArtifact(jobId: string, artifactId: string): Promise<Buffer> {
    const build = BUILD_DATABASE.get(jobId);

    if (!build) {
      throw new Error(`Build not found: ${jobId}`);
    }

    const artifact = build.artifacts.find((a) => a.id === artifactId);

    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    // In production, fetch from artifact storage
    // For demo, return mock buffer
    const mockContent = `Mock artifact: ${artifact.name}\nSize: ${artifact.size} bytes\nChecksum: ${artifact.checksum}`;
    return Buffer.from(mockContent);
  }

  /**
   * Sign an APK
   */
  async signAPK(apkPath: string, signingConfig: SigningConfig): Promise<string> {
    // Validate signing config
    if (!signingConfig.keystorePath || !signingConfig.keyAlias) {
      throw new Error('Invalid signing configuration');
    }

    // In production, use jarsigner or similar tools
    // For demo, simulate signing
    const signedApkPath = apkPath.replace('.apk', '-signed.apk');

    console.log(`[BuildPipeline] Signing APK: ${apkPath}`);
    console.log(`[BuildPipeline] Using keystore: ${signingConfig.keystorePath}`);
    console.log(`[BuildPipeline] Signed APK: ${signedApkPath}`);

    return signedApkPath;
  }

  /**
   * Simulate build phases
   */
  private async simulateBuildPhases(jobId: string): Promise<void> {
    const build = BUILD_DATABASE.get(jobId);
    if (!build) return;

    // Phase 1: Preparing (5% -> 20%)
    await this.sleep(500);
    build.progress = 20;
    this.log(jobId, 'info', 'Environment prepared, installing dependencies');

    // Phase 2: Building (20% -> 70%)
    await this.sleep(800);
    build.status = 'building';
    build.progress = 45;
    this.log(jobId, 'info', 'Compiling source code');

    await this.sleep(1000);
    build.progress = 70;
    this.log(jobId, 'info', 'Bundling resources');

    // Phase 3: Signing (70% -> 90%)
    if (build.configuration.releaseMode === 'release') {
      await this.sleep(600);
      build.status = 'signing';
      build.progress = 85;

      if (build.configuration.signingConfig) {
        this.log(jobId, 'info', 'Signing APK with production key');
      }
    }

    // Phase 4: Complete
    await this.sleep(500);
    build.status = 'complete';
    build.progress = 100;
    build.endTime = new Date();

    // Create artifact
    const artifact: BuildArtifact = {
      id: `artifact-${Date.now()}`,
      name: `${build.configuration.appName}-${build.configuration.appVersion}.${build.configuration.targetFormat}`,
      path: `/artifacts/${build.id}/${build.configuration.appName}.${build.configuration.targetFormat}`,
      size: Math.floor(Math.random() * 50 * 1024 * 1024) + 10 * 1024 * 1024, // 10-60 MB
      mimeType: 'application/vnd.android.package-archive',
      checksum: `sha256-${Date.now()}`,
      createdAt: new Date(),
    };

    build.artifacts.push(artifact);

    this.log(
      jobId,
      'info',
      `Build successful! Artifact: ${artifact.name} (${this.formatSize(artifact.size)})`
    );

    this.activeBuild = null;
  }

  /**
   * Log a build message
   */
  private log(jobId: string, level: 'info' | 'warn' | 'error', message: string): void {
    const build = BUILD_DATABASE.get(jobId);
    if (!build) return;

    build.logs.push({
      timestamp: new Date(),
      level,
      message,
    });
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: Format bytes to human readable
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get build statistics
   */
  async getBuildStats(appId: string): Promise<{
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    averageDuration: number;
  }> {
    const builds = Array.from(BUILD_DATABASE.values()).filter(
      (b) => b.appId === appId && b.endTime
    );

    const successful = builds.filter((b) => b.status === 'complete').length;
    const failed = builds.filter((b) => b.status === 'failed').length;

    const durations = builds
      .filter((b) => b.startTime && b.endTime)
      .map(
        (b) =>
          (b.endTime!.getTime() - b.startTime!.getTime()) / 1000 // seconds
      );

    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      totalBuilds: builds.length,
      successfulBuilds: successful,
      failedBuilds: failed,
      averageDuration,
    };
  }
}

export default new BuildPipeline();
export { BuildPipeline };
