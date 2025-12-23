/**
 * useTemplates Hook - Template Management
 * High-level API for template operations
 */

import { useCallback, useEffect } from 'react';
import { useTemplateStore } from '../stores/templateStore';
import { useIPC } from './useIPC';
import type { Template, MorphConfig } from '@shared/types';

export const useTemplates = () => {
  const store = useTemplateStore();
  const ipc = useIPC();

  // Load templates on mount
  useEffect(() => {
    store.loadTemplates().catch(console.error);
  }, [store]);

  const selectTemplate = useCallback(
    (templateId: string) => {
      return store.selectTemplate(templateId);
    },
    [store]
  );

  const validateMorphConfig = useCallback(
    (templateId: string, config: MorphConfig) => {
      return store.validateMorphConfig();
    },
    [store]
  );

  const createInstance = useCallback(
    async (templateId: string, config: MorphConfig) => {
      try {
        const result = await ipc.invoke('templates:instantiate', {
          templateId,
          config,
        });
        await store.loadInstances(templateId);
        return result;
      } catch (error) {
        throw error;
      }
    },
    [ipc, store]
  );

  const previewMorph = useCallback(
    async (templateId: string, config: MorphConfig) => {
      return ipc.invoke('templates:preview', { templateId, config });
    },
    [ipc]
  );

  return {
    templates: store.templates,
    selectedTemplate: store.selectedTemplate,
    instances: store.instances,
    isLoading: store.isLoading,
    error: store.error,
    selectTemplate,
    validateMorphConfig,
    createInstance,
    previewMorph,
    updateMorphConfig: store.updateMorphConfig,
    loadMorphPoints: store.loadMorphPoints,
  };
};

export default useTemplates;
