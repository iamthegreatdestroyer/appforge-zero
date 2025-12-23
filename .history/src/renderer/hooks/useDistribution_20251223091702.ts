/**
 * useDistribution Hook - Distribution Channel Operations
 * High-level API for publishing and sales
 */

import { useCallback } from "react";
import { useIPC } from "./useIPC";

interface DistributionState {
  channels: any[];
  publications: any[];
  sales: any[];
}

export const useDistribution = () => {
  const ipc = useIPC();

  const configureChannel = useCallback(
    async (channelId: string, config: any) => {
      return ipc.invoke("distribution:configureChannel", {
        channelId,
        config,
      });
    },
    [ipc]
  );

  const publishApp = useCallback(
    async (appId: string, channels: string[], pricing: any) => {
      return ipc.invoke("distribution:publish", {
        appId,
        channels,
        pricing,
      });
    },
    [ipc]
  );

  const unpublishApp = useCallback(
    async (publicationId: string) => {
      return ipc.invoke("distribution:unpublish", {
        publicationId,
      });
    },
    [ipc]
  );

  const getSales = useCallback(
    async (publicationId?: string) => {
      return ipc.invoke("distribution:getSales", {
        publicationId,
      });
    },
    [ipc]
  );

  const getChannelStatus = useCallback(
    async (channelId: string) => {
      return ipc.invoke("distribution:getChannelStatus", {
        channelId,
      });
    },
    [ipc]
  );

  return {
    configureChannel,
    publishApp,
    unpublishApp,
    getSales,
    getChannelStatus,
  };
};

export default useDistribution;
