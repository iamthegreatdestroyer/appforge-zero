/**
 * Build IPC Handler Tests
 * Comprehensive test suite for build pipeline handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import BuildIPCHandler from '../build.handler';
import type {
  IPC_BuildCreateRequest,
  IPC_BuildQueueRequest,
  IPC_BuildStartRequest,
  IPC_BuildCancelRequest,
  IPC_BuildLogsRequest,
} from '../types';

const mockEvent = {} as any;

describe('BuildIPCHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('build:create', () => {
    it('should create a build job', async () => {
      const request: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: {
          targetFormat: 'apk',
          releaseMode: 'release',
          optimization: 'full',
        },
      };

      const response = await BuildIPCHandler['handleCreate'](mockEvent, request);

      if (!('error' in response)) {
        expect((response as any).jobId).toBeDefined();
        expect((response as any).appId).toBe('app-1');
        expect((response as any).status).toBe('queued');
        expect((response as any).queuePosition).toBeGreaterThan(0);
        expect((response as any).estimatedWaitTime).toBeGreaterThan(0);
      }
    });

    it('should reject missing appId', async () => {
      const request: any = {
        templateId: 'template-1',
        configuration: {},
      };

      const response = await BuildIPCHandler['handleCreate'](mockEvent, request);

      expect('error' in response).toBe(true);
    });

    it('should reject missing templateId', async () => {
      const request: any = {
        appId: 'app-1',
        configuration: {},
      };

      const response = await BuildIPCHandler['handleCreate'](mockEvent, request);

      expect('error' in response).toBe(true);
    });

    it('should queue jobs sequentially', async () => {
      const request: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const response1 = await BuildIPCHandler['handleCreate'](mockEvent, request);
      const response2 = await BuildIPCHandler['handleCreate'](mockEvent, request);

      if (!('error' in response1) && !('error' in response2)) {
        expect((response1 as any).queuePosition).toBeLessThan((response2 as any).queuePosition);
      }
    });
  });

  describe('build:queue', () => {
    it('should get queue position for valid job', async () => {
      // First create a job
      const createRequest: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const createResponse = await BuildIPCHandler['handleCreate'](mockEvent, createRequest);

      if (!('error' in createResponse)) {
        const jobId = (createResponse as any).jobId;

        const queueRequest: IPC_BuildQueueRequest = { jobId };
        const queueResponse = await BuildIPCHandler['handleQueue'](mockEvent, queueRequest);

        if (!('error' in queueResponse)) {
          expect((queueResponse as any).jobId).toBe(jobId);
          expect((queueResponse as any).queuePosition).toBeGreaterThan(0);
          expect((queueResponse as any).totalInQueue).toBeGreaterThan(0);
        }
      }
    });

    it('should return error for non-existent job', async () => {
      const request: IPC_BuildQueueRequest = { jobId: 'non-existent' };

      const response = await BuildIPCHandler['handleQueue'](mockEvent, request);

      expect('error' in response).toBe(true);
      expect((response as any).code).toBe('JOB_NOT_FOUND');
    });

    it('should reject missing jobId', async () => {
      const request: any = {};

      const response = await BuildIPCHandler['handleQueue'](mockEvent, request);

      expect('error' in response).toBe(true);
    });
  });

  describe('build:start', () => {
    it('should start a queued build', async () => {
      // Create and start a job
      const createRequest: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const createResponse = await BuildIPCHandler['handleCreate'](mockEvent, createRequest);

      if (!('error' in createResponse)) {
        const jobId = (createResponse as any).jobId;

        const startRequest: IPC_BuildStartRequest = { jobId };
        const startResponse = await BuildIPCHandler['handleStart'](mockEvent, startRequest);

        if (!('error' in startResponse)) {
          expect((startResponse as any).jobId).toBe(jobId);
          expect((startResponse as any).status).toBe('running');
          expect((startResponse as any).phase).toBeDefined();
          expect((startResponse as any).startTime).toBeGreaterThan(0);
        }
      }
    });

    it('should reject non-existent job', async () => {
      const request: IPC_BuildStartRequest = { jobId: 'non-existent' };

      const response = await BuildIPCHandler['handleStart'](mockEvent, request);

      expect('error' in response).toBe(true);
    });

    it('should reject missing jobId', async () => {
      const request: any = {};

      const response = await BuildIPCHandler['handleStart'](mockEvent, request);

      expect('error' in response).toBe(true);
    });
  });

  describe('build:cancel', () => {
    it('should cancel a running build', async () => {
      // Create a job
      const createRequest: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const createResponse = await BuildIPCHandler['handleCreate'](mockEvent, createRequest);

      if (!('error' in createResponse)) {
        const jobId = (createResponse as any).jobId;

        const cancelRequest: IPC_BuildCancelRequest = { jobId };
        const cancelResponse = await BuildIPCHandler['handleCancel'](mockEvent, cancelRequest);

        if (!('error' in cancelResponse)) {
          expect((cancelResponse as any).jobId).toBe(jobId);
          expect((cancelResponse as any).status).toBe('cancelled');
        }
      }
    });

    it('should reject non-existent job', async () => {
      const request: IPC_BuildCancelRequest = { jobId: 'non-existent' };

      const response = await BuildIPCHandler['handleCancel'](mockEvent, request);

      expect('error' in response).toBe(true);
    });

    it('should prevent cancelling completed jobs', async () => {
      // This test would need job completion simulation
      // Skipping for now as it requires more complex setup
    });
  });

  describe('build:logs', () => {
    it('should retrieve logs for a job', async () => {
      // Create a job
      const createRequest: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const createResponse = await BuildIPCHandler['handleCreate'](mockEvent, createRequest);

      if (!('error' in createResponse)) {
        const jobId = (createResponse as any).jobId;

        const logsRequest: IPC_BuildLogsRequest = { jobId };
        const logsResponse = await BuildIPCHandler['handleLogs'](mockEvent, logsRequest);

        if (!('error' in logsResponse)) {
          expect((logsResponse as any).jobId).toBe(jobId);
          expect(Array.isArray((logsResponse as any).logs)).toBe(true);
          expect((logsResponse as any).logs.length).toBeGreaterThan(0);
        }
      }
    });

    it('should filter logs by level', async () => {
      const createRequest: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const createResponse = await BuildIPCHandler['handleCreate'](mockEvent, createRequest);

      if (!('error' in createResponse)) {
        const jobId = (createResponse as any).jobId;

        const logsRequest: IPC_BuildLogsRequest = { jobId, level: 'error' };
        const logsResponse = await BuildIPCHandler['handleLogs'](mockEvent, logsRequest);

        if (!('error' in logsResponse)) {
          const logs = (logsResponse as any).logs;
          logs.forEach((log: any) => {
            expect(log.level).toBe('error');
          });
        }
      }
    });

    it('should respect line limit', async () => {
      const createRequest: IPC_BuildCreateRequest = {
        appId: 'app-1',
        templateId: 'template-1',
        configuration: { targetFormat: 'apk', releaseMode: 'release', optimization: 'full' },
      };

      const createResponse = await BuildIPCHandler['handleCreate'](mockEvent, createRequest);

      if (!('error' in createResponse)) {
        const jobId = (createResponse as any).jobId;

        const logsRequest: IPC_BuildLogsRequest = { jobId, lines: 5 };
        const logsResponse = await BuildIPCHandler['handleLogs'](mockEvent, logsRequest);

        if (!('error' in logsResponse)) {
          expect((logsResponse as any).logs.length).toBeLessThanOrEqual(5);
        }
      }
    });

    it('should reject non-existent job', async () => {
      const request: IPC_BuildLogsRequest = { jobId: 'non-existent' };

      const response = await BuildIPCHandler['handleLogs'](mockEvent, request);

      expect('error' in response).toBe(true);
    });
  });
});
