/**
 * useBuild Hook - Build Operations
 * High-level API for build queue and build management
 */

import { useCallback, useEffect } from 'react';
import { useBuildStore } from '../stores/buildStore';
import { useIPC } from './useIPC';

export const useBuild = () => {
  const store = useBuildStore();
  const ipc = useIPC();

  // Monitor active builds
  useEffect(() => {
    const unsubscribe = ipc.on('builds:progress', (data) => {
      // Update progress in store
    });

    return () => {
      unsubscribe?.();
    };
  }, [ipc]);

  const startBuild = useCallback(
    async (instanceId: string) => {
      try {
        const job = await ipc.invoke('builds:create', { instanceId });
        await store.addToQueue(instanceId, job);
        return job;
      } catch (error) {
        throw error;
      }
    },
    [ipc, store]
  );

  const cancelBuild = useCallback(
    async (jobId: string) => {
      await ipc.invoke('builds:cancel', { jobId });
      await store.cancelBuild(jobId);
    },
    [ipc, store]
  );

  const retryBuild = useCallback(
    async (resultId: string) => {
      const result = store.selectedBuild || store.history.find((h) => h.id === resultId);
      if (!result) throw new Error('Build result not found');
      return store.retryBuild(resultId);
    },
    [store]
  );

  const openAPK = useCallback(
    async (apkPath: string) => {
      return ipc.invoke('app:openPath', { path: apkPath });
    },
    [ipc]
  );

  return {
    queue: store.queue,
    activeBuilds: store.activeBuilds,
    history: store.history,
    selectedBuild: store.selectedBuild,
    isLoading: store.isLoading,
    error: store.error,
    stats: store.stats,
    startBuild,
    cancelBuild,
    retryBuild,
    openAPK,
    loadHistory: store.loadHistory,
    clearQueue: store.clearQueue,
    selectBuild: store.selectBuild,
  };
};

export default useBuild;
