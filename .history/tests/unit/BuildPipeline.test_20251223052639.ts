/**
 * Unit Tests for BuildPipeline
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs-extra';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 100);
      }
    }),
    kill: vi.fn(),
  })),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  ensureDir: vi.fn(),
  copy: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  remove: vi.fn(),
  chmod: vi.fn(),
}));

describe('BuildPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPrerequisites', () => {
    it('should pass when all prerequisites are met', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      
      const { BuildPipeline } = await import('@main/services/BuildPipeline');
      const pipeline = new BuildPipeline();
      
      const result = await pipeline.checkPrerequisites({
        androidSdkRoot: '/mock/android/sdk',
        javaHome: '/mock/java',
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when Android SDK is not found', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      
      const { BuildPipeline } = await import('@main/services/BuildPipeline');
      const pipeline = new BuildPipeline();
      
      const result = await pipeline.checkPrerequisites({
        androidSdkRoot: '/nonexistent/sdk',
        javaHome: '/nonexistent/java',
      });
      
      expect(result.valid).toBe(false);
      expect(result.androidSdkFound).toBe(false);
    });
  });

  describe('cancelBuild', () => {
    it('should return false when no build is running', async () => {
      const { BuildPipeline } = await import('@main/services/BuildPipeline');
      const pipeline = new BuildPipeline();
      
      const result = pipeline.cancelBuild();
      
      expect(result).toBe(false);
    });
  });

  describe('getBuildInfo', () => {
    it('should detect Kotlin DSL build files', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (path: any) => {
        if (path.includes('build.gradle.kts')) return true;
        if (path.includes('gradlew')) return true;
        if (path.includes('settings.gradle.kts')) return true;
        return false;
      });
      
      vi.mocked(fs.readFile).mockResolvedValue("include(':app')");
      
      const { BuildPipeline } = await import('@main/services/BuildPipeline');
      const pipeline = new BuildPipeline();
      
      const info = await pipeline.getBuildInfo('/mock/project');
      
      expect(info.buildGradleType).toBe('kotlin');
      expect(info.hasGradleWrapper).toBe(true);
    });
  });
});
