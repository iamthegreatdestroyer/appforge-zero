/**
 * useTrends Hook - Trend Analysis
 * High-level API for trend operations
 */

import { useCallback, useEffect } from "react";
import { useTrendStore } from "../stores/trendStore";
import { useIPC } from "./useIPC";

export const useTrends = () => {
  const store = useTrendStore();
  const ipc = useIPC();

  // Monitor scan progress
  useEffect(() => {
    const unsubscribeScan = ipc.on("trends:scanProgress", (data) => {
      // Update scan progress in store
    });

    const unsubscribeScanComplete = ipc.on("trends:scanComplete", (data) => {
      // Refresh trends after scan completes
      store.loadTrends().catch(console.error);
    });

    return () => {
      unsubscribeScan?.();
      unsubscribeScanComplete?.();
    };
  }, [ipc, store]);

  const startScan = useCallback(
    async (sources: string[] = ["google", "reddit"]) => {
      try {
        const result = await ipc.invoke("trends:scan", { sources });
        await store.loadTrends();
        return result;
      } catch (error) {
        throw error;
      }
    },
    [ipc, store]
  );

  const selectTrend = useCallback(
    (trendId: string) => {
      store.selectTrend(trendId);
    },
    [store]
  );

  const createAppFromTrend = useCallback(
    async (trendId: string, templateId: string) => {
      const trend = store.trends.find((t) => t.id === trendId);
      if (!trend) throw new Error("Trend not found");

      return ipc.invoke("templates:createFromTrend", {
        trendId,
        templateId,
        keyword: trend.keyword,
      });
    },
    [ipc, store]
  );

  const favoriteTrend = useCallback(
    async (trendId: string, isFavorite: boolean) => {
      await store.favoriteTrend(trendId, isFavorite);
    },
    [store]
  );

  return {
    trends: store.trends,
    selectedTrend: store.selectedTrend,
    insights: store.insights,
    filters: store.filters,
    scanProgress: store.scanProgress,
    lastScanAt: store.lastScanAt,
    stats: store.stats,
    isLoading: store.isLoading,
    error: store.error,
    startScan,
    selectTrend,
    createAppFromTrend,
    favoriteTrend,
    setFilters: store.setFilters,
    loadTrends: store.loadTrends,
    archiveTrend: store.archiveTrend,
    deleteTrend: store.deleteTrend,
  };
};

export default useTrends;
