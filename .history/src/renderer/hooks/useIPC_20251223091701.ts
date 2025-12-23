/**
 * useIPC Hook - IPC Communication Utility
 * Simplified async/await based IPC channel communication
 */

import { useCallback, useState } from "react";

interface UseIPCOptions {
  timeout?: number;
  onError?: (error: Error) => void;
  onSuccess?: (result: any) => void;
}

export const useIPC = (options: UseIPCOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const invoke = useCallback(
    async <T = any>(channel: string, args?: any): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await (window as any).api?.invoke(channel, args);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const on = useCallback((channel: string, callback: (data: any) => void) => {
    return (window as any).api?.on(channel, callback);
  }, []);

  const off = useCallback((channel: string, callback: (data: any) => void) => {
    return (window as any).api?.off(channel, callback);
  }, []);

  return { invoke, on, off, isLoading, error };
};

export default useIPC;
