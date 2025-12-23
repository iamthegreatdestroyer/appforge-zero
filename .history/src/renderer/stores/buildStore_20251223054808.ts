/**
 * Build Store - Build queue and progress state management
 * Handles APK build lifecycle, queue management, and build history
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BuildJob, BuildStatus, BuildResult, TemplateInstance } from '@shared/types';

interface BuildProgress {
  jobId: string;
  phase: 'queued' | 'preparing' | 'morphing' | 'compiling' | 'signing' | 'complete' | 'failed';
  progress: number;
  message: string;
  startedAt?: number;
  estimatedCompletion?: number;
}

interface BuildFilters {
  status: BuildStatus | 'all';
  templateId: string | null;
  dateRange: { start: number; end: number } | null;
}

interface BuildState {
  queue: BuildJob[];
  activeBuilds: BuildProgress[];
  history: BuildResult[];
  selectedBuild: BuildResult | null;
  filters: BuildFilters;
  isLoading: boolean;
  error: string | null;
  stats: {
    totalBuilds: number;
    successRate: number;
    averageBuildTime: number;
    todayBuilds: number;
  };

  // Queue actions
  loadQueue: () => Promise<void>;
  addToQueue: (instanceId: string, options?: Partial<BuildJob>) => Promise<BuildJob>;
  removeFromQueue: (jobId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  reorderQueue: (jobIds: string[]) => Promise<void>;
  pauseQueue: () => Promise<void>;
  resumeQueue: () => Promise<void>;

  // Build actions
  startBuild: (jobId: string) => Promise<void>;
  cancelBuild: (jobId: string) => Promise<void>;
  retryBuild: (resultId: string) => Promise<BuildJob>;

  // History actions
  loadHistory: (limit?: number) => Promise<void>;
  selectBuild: (resultId: string) => void;
  deleteBuildResult: (resultId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  exportBuildLog: (resultId: string) => Promise<string>;

  // Progress subscription
  subscribeToProgress: () => () => void;
  updateProgress: (progress: BuildProgress) => void;

  // Filter actions
  setFilters: (filters: Partial<BuildFilters>) => void;
  resetFilters: () => void;

  // Stats
  loadStats: () => Promise<void>;

  // Utility
  clearError: () => void;
}

const defaultFilters: BuildFilters = {
  status: 'all',
  templateId: null,
  dateRange: null,
};

export const useBuildStore = create<BuildState>()(
  devtools(
    (set, get) => ({
      queue: [],
      activeBuilds: [],
      history: [],
      selectedBuild: null,
      filters: defaultFilters,
      isLoading: false,
      error: null,
      stats: {
        totalBuilds: 0,
        successRate: 0,
        averageBuildTime: 0,
        todayBuilds: 0,
      },

      // Queue actions
      loadQueue: async () => {
        set({ isLoading: true, error: null });
        try {
          const queue = await window.api.builds.getQueue();
          set({ queue, isLoading: false });
        } catch (error) {
          console.error('Failed to load build queue:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load queue',
            isLoading: false,
          });
        }
      },

      addToQueue: async (instanceId: string, options?: Partial<BuildJob>) => {
        try {
          const job = await window.api.builds.enqueue(instanceId, options);
          set((state) => ({ queue: [...state.queue, job] }));
          return job;
        } catch (error) {
          console.error('Failed to add to queue:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to add to queue' });
          throw error;
        }
      },

      removeFromQueue: async (jobId: string) => {
        try {
          await window.api.builds.dequeue(jobId);
          set((state) => ({
            queue: state.queue.filter((j) => j.id !== jobId),
          }));
        } catch (error) {
          console.error('Failed to remove from queue:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove from queue' });
        }
      },

      clearQueue: async () => {
        try {
          await window.api.builds.clearQueue();
          set({ queue: [] });
        } catch (error) {
          console.error('Failed to clear queue:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to clear queue' });
        }
      },

      reorderQueue: async (jobIds: string[]) => {
        try {
          await window.api.builds.reorderQueue(jobIds);
          const { queue } = get();
          const reordered = jobIds
            .map((id) => queue.find((j) => j.id === id))
            .filter(Boolean) as BuildJob[];
          set({ queue: reordered });
        } catch (error) {
          console.error('Failed to reorder queue:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to reorder queue' });
        }
      },

      pauseQueue: async () => {
        try {
          await window.api.builds.pauseQueue();
        } catch (error) {
          console.error('Failed to pause queue:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to pause queue' });
        }
      },

      resumeQueue: async () => {
        try {
          await window.api.builds.resumeQueue();
        } catch (error) {
          console.error('Failed to resume queue:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to resume queue' });
        }
      },

      // Build actions
      startBuild: async (jobId: string) => {
        try {
          await window.api.builds.start(jobId);
          set((state) => ({
            queue: state.queue.map((j) =>
              j.id === jobId ? { ...j, status: 'building' as BuildStatus } : j
            ),
            activeBuilds: [
              ...state.activeBuilds,
              {
                jobId,
                phase: 'preparing',
                progress: 0,
                message: 'Starting build...',
                startedAt: Date.now(),
              },
            ],
          }));
        } catch (error) {
          console.error('Failed to start build:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to start build' });
        }
      },

      cancelBuild: async (jobId: string) => {
        try {
          await window.api.builds.cancel(jobId);
          set((state) => ({
            activeBuilds: state.activeBuilds.filter((b) => b.jobId !== jobId),
            queue: state.queue.map((j) =>
              j.id === jobId ? { ...j, status: 'cancelled' as BuildStatus } : j
            ),
          }));
        } catch (error) {
          console.error('Failed to cancel build:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to cancel build' });
        }
      },

      retryBuild: async (resultId: string) => {
        try {
          const job = await window.api.builds.retry(resultId);
          set((state) => ({ queue: [...state.queue, job] }));
          return job;
        } catch (error) {
          console.error('Failed to retry build:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to retry build' });
          throw error;
        }
      },

      // History actions
      loadHistory: async (limit = 50) => {
        set({ isLoading: true, error: null });
        try {
          const { filters } = get();
          const history = await window.api.builds.getHistory({
            limit,
            status: filters.status !== 'all' ? filters.status : undefined,
            templateId: filters.templateId || undefined,
            dateRange: filters.dateRange || undefined,
          });
          set({ history, isLoading: false });
        } catch (error) {
          console.error('Failed to load history:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load history',
            isLoading: false,
          });
        }
      },

      selectBuild: (resultId: string) => {
        const { history } = get();
        const build = history.find((r) => r.id === resultId) || null;
        set({ selectedBuild: build });
      },

      deleteBuildResult: async (resultId: string) => {
        try {
          await window.api.builds.deleteResult(resultId);
          set((state) => ({
            history: state.history.filter((r) => r.id !== resultId),
            selectedBuild:
              state.selectedBuild?.id === resultId ? null : state.selectedBuild,
          }));
        } catch (error) {
          console.error('Failed to delete build result:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete result' });
        }
      },

      clearHistory: async () => {
        try {
          await window.api.builds.clearHistory();
          set({ history: [], selectedBuild: null });
        } catch (error) {
          console.error('Failed to clear history:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to clear history' });
        }
      },

      exportBuildLog: async (resultId: string) => {
        try {
          return await window.api.builds.exportLog(resultId);
        } catch (error) {
          console.error('Failed to export build log:', error);
          throw error;
        }
      },

      // Progress subscription
      subscribeToProgress: () => {
        const unsubscribe = window.api.builds.onProgress((progress: BuildProgress) => {
          get().updateProgress(progress);
        });
        return unsubscribe;
      },

      updateProgress: (progress: BuildProgress) => {
        set((state) => {
          const existingIndex = state.activeBuilds.findIndex(
            (b) => b.jobId === progress.jobId
          );

          if (progress.phase === 'complete' || progress.phase === 'failed') {
            // Remove from active builds
            return {
              activeBuilds: state.activeBuilds.filter((b) => b.jobId !== progress.jobId),
              queue: state.queue.filter((j) => j.id !== progress.jobId),
            };
          }

          if (existingIndex >= 0) {
            const newActiveBuilds = [...state.activeBuilds];
            newActiveBuilds[existingIndex] = progress;
            return { activeBuilds: newActiveBuilds };
          }

          return { activeBuilds: [...state.activeBuilds, progress] };
        });
      },

      // Filter actions
      setFilters: (filters: Partial<BuildFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
      },

      // Stats
      loadStats: async () => {
        try {
          const stats = await window.api.builds.getStats();
          set({ stats });
        } catch (error) {
          console.error('Failed to load build stats:', error);
        }
      },

      // Utility
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'BuildStore' }
  )
);

export default useBuildStore;
