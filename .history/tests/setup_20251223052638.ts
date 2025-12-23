/**
 * Test Setup Configuration
 * Runs before all tests to set up the testing environment
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: '/tmp/appforge-test',
        home: '/tmp',
        temp: '/tmp',
      };
      return paths[name] || '/tmp';
    }),
    getName: vi.fn(() => 'AppForge Zero'),
    getVersion: vi.fn(() => '0.1.0'),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

// Set up test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.ANDROID_SDK_ROOT = '/mock/android/sdk';
  process.env.JAVA_HOME = '/mock/java';
});

// Clean up after all tests
afterAll(() => {
  vi.clearAllMocks();
});
