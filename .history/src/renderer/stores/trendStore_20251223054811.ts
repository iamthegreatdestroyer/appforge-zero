/**
 * Trend Store - Trend data and scanning state management
 * Handles trend discovery, analysis, and AI-powered suggestions
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Trend, TrendSource, TrendCategory } from '@shared/types';

interface TrendInsight {
  id: string;
  trendId: string;
  type: 'opportunity' | 'warning' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  suggestedTemplates: string[];
  createdAt: number;
}

interface TrendFilters {
  search: string;
  sources: TrendSource[];
  categories: TrendCategory[];
  minScore: number;
  dateRange: { start: number; end: number } | null;
}

interface ScanProgress {
  isScanning: boolean;
  source: TrendSource | null;
  progress: number;
  message: string;
  startedAt: number | null;
}

interface TrendState {
  trends: Trend[];
  selectedTrend: Trend | null;
  insights: TrendInsight[];
  filters: TrendFilters;
  scanProgress: ScanProgress;
  isLoading: boolean;
  error: string | null;
  lastScanAt: number | null;
  stats: {
    totalTrends: number;
    topCategories: { category: TrendCategory; count: number }[];
    trendingUp: number;
    trendingDown: number;
  };

  // Trend actions
  loadTrends: () => Promise<void>;
  selectTrend: (trendId: string) => void;
  archiveTrend: (trendId: string) => Promise<void>;
  favoriteTrend: (trendId: string, favorite: boolean) => Promise<void>;
  deleteTrend: (trendId: string) => Promise<void>;

  // Scanning actions
  startScan: (sources?: TrendSource[]) => Promise<void>;
  cancelScan: () => Promise<void>;
  scheduleAutoScan: (intervalHours: number) => Promise<void>;
  cancelAutoScan: () => Promise<void>;

  // Insight actions
  loadInsights: (trendId?: string) => Promise<void>;
  generateInsight: (trendId: string) => Promise<TrendInsight>;
  dismissInsight: (insightId: string) => Promise<void>;
  applyInsight: (insightId: string) => Promise<void>;

  // Filter actions
  setFilters: (filters: Partial<TrendFilters>) => void;
  resetFilters: () => void;

  // Stats
  loadStats: () => Promise<void>;

  // Progress subscription
  subscribeToScanProgress: () => () => void;

  // Utility
  clearError: () => void;
  getFilteredTrends: () => Trend[];
}

const defaultFilters: TrendFilters = {
  search: '',
  sources: [],
  categories: [],
  minScore: 0,
  dateRange: null,
};

const defaultScanProgress: ScanProgress = {
  isScanning: false,
  source: null,
  progress: 0,
  message: '',
  startedAt: null,
};

export const useTrendStore = create<TrendState>()(
  devtools(
    (set, get) => ({
      trends: [],
      selectedTrend: null,
      insights: [],
      filters: defaultFilters,
      scanProgress: defaultScanProgress,
      isLoading: false,
      error: null,
      lastScanAt: null,
      stats: {
        totalTrends: 0,
        topCategories: [],
        trendingUp: 0,
        trendingDown: 0,
      },

      // Trend actions
      loadTrends: async () => {
        set({ isLoading: true, error: null });
        try {
          const trends = await window.api.trends.list();
          set({ trends, isLoading: false });
        } catch (error) {
          console.error('Failed to load trends:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load trends',
            isLoading: false,
          });
        }
      },

      selectTrend: (trendId: string) => {
        const { trends } = get();
        const trend = trends.find((t) => t.id === trendId) || null;
        set({ selectedTrend: trend });
      },

      archiveTrend: async (trendId: string) => {
        try {
          await window.api.trends.archive(trendId);
          set((state) => ({
            trends: state.trends.map((t) =>
              t.id === trendId ? { ...t, archived: true } : t
            ),
          }));
        } catch (error) {
          console.error('Failed to archive trend:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to archive trend' });
        }
      },

      favoriteTrend: async (trendId: string, favorite: boolean) => {
        try {
          await window.api.trends.favorite(trendId, favorite);
          set((state) => ({
            trends: state.trends.map((t) =>
              t.id === trendId ? { ...t, favorite } : t
            ),
          }));
        } catch (error) {
          console.error('Failed to favorite trend:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to favorite trend' });
        }
      },

      deleteTrend: async (trendId: string) => {
        try {
          await window.api.trends.delete(trendId);
          set((state) => ({
            trends: state.trends.filter((t) => t.id !== trendId),
            selectedTrend:
              state.selectedTrend?.id === trendId ? null : state.selectedTrend,
          }));
        } catch (error) {
          console.error('Failed to delete trend:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete trend' });
        }
      },

      // Scanning actions
      startScan: async (sources?: TrendSource[]) => {
        set({
          scanProgress: {
            isScanning: true,
            source: null,
            progress: 0,
            message: 'Initializing scan...',
            startedAt: Date.now(),
          },
          error: null,
        });

        try {
          const result = await window.api.trends.scan(sources);
          set((state) => ({
            trends: [...result.newTrends, ...state.trends],
            lastScanAt: Date.now(),
            scanProgress: defaultScanProgress,
          }));
          
          // Reload stats after scan
          get().loadStats();
        } catch (error) {
          console.error('Failed to start scan:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to start scan',
            scanProgress: defaultScanProgress,
          });
        }
      },

      cancelScan: async () => {
        try {
          await window.api.trends.cancelScan();
          set({ scanProgress: defaultScanProgress });
        } catch (error) {
          console.error('Failed to cancel scan:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to cancel scan' });
        }
      },

      scheduleAutoScan: async (intervalHours: number) => {
        try {
          await window.api.trends.scheduleAutoScan(intervalHours);
        } catch (error) {
          console.error('Failed to schedule auto scan:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to schedule scan' });
        }
      },

      cancelAutoScan: async () => {
        try {
          await window.api.trends.cancelAutoScan();
        } catch (error) {
          console.error('Failed to cancel auto scan:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to cancel auto scan' });
        }
      },

      // Insight actions
      loadInsights: async (trendId?: string) => {
        try {
          const insights = await window.api.trends.getInsights(trendId);
          set({ insights });
        } catch (error) {
          console.error('Failed to load insights:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load insights' });
        }
      },

      generateInsight: async (trendId: string) => {
        try {
          const insight = await window.api.trends.generateInsight(trendId);
          set((state) => ({ insights: [...state.insights, insight] }));
          return insight;
        } catch (error) {
          console.error('Failed to generate insight:', error);
          throw error;
        }
      },

      dismissInsight: async (insightId: string) => {
        try {
          await window.api.trends.dismissInsight(insightId);
          set((state) => ({
            insights: state.insights.filter((i) => i.id !== insightId),
          }));
        } catch (error) {
          console.error('Failed to dismiss insight:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to dismiss insight' });
        }
      },

      applyInsight: async (insightId: string) => {
        try {
          await window.api.trends.applyInsight(insightId);
          set((state) => ({
            insights: state.insights.filter((i) => i.id !== insightId),
          }));
        } catch (error) {
          console.error('Failed to apply insight:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to apply insight' });
        }
      },

      // Filter actions
      setFilters: (filters: Partial<TrendFilters>) => {
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
          const stats = await window.api.trends.getStats();
          set({ stats });
        } catch (error) {
          console.error('Failed to load trend stats:', error);
        }
      },

      // Progress subscription
      subscribeToScanProgress: () => {
        const unsubscribe = window.api.trends.onScanProgress((progress: Partial<ScanProgress>) => {
          set((state) => ({
            scanProgress: { ...state.scanProgress, ...progress },
          }));
        });
        return unsubscribe;
      },

      // Utility
      clearError: () => {
        set({ error: null });
      },

      getFilteredTrends: () => {
        const { trends, filters } = get();
        let filtered = [...trends];

        // Search filter
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.title.toLowerCase().includes(search) ||
              t.description?.toLowerCase().includes(search) ||
              t.keywords?.some((k) => k.toLowerCase().includes(search))
          );
        }

        // Source filter
        if (filters.sources.length > 0) {
          filtered = filtered.filter((t) => filters.sources.includes(t.source));
        }

        // Category filter
        if (filters.categories.length > 0) {
          filtered = filtered.filter((t) => filters.categories.includes(t.category));
        }

        // Score filter
        if (filters.minScore > 0) {
          filtered = filtered.filter((t) => t.score >= filters.minScore);
        }

        // Date range filter
        if (filters.dateRange) {
          filtered = filtered.filter(
            (t) =>
              t.discoveredAt >= filters.dateRange!.start &&
              t.discoveredAt <= filters.dateRange!.end
          );
        }

        return filtered;
      },
    }),
    { name: 'TrendStore' }
  )
);

export default useTrendStore;
