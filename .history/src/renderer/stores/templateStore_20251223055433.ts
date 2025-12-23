/**
 * Template Store - Template management state
 * Handles template CRUD, morphing configuration, and template instantiation
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Template, MorphPoint, MorphConfig, TemplateInstance } from '@shared/types';

interface TemplateFilters {
  search: string;
  category: string | null;
  sortBy: 'name' | 'created' | 'updated' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

interface TemplateState {
  templates: Template[];
  selectedTemplate: Template | null;
  morphPoints: MorphPoint[];
  morphConfig: MorphConfig | null;
  instances: TemplateInstance[];
  filters: TemplateFilters;
  isLoading: boolean;
  error: string | null;
  
  // Template actions
  loadTemplates: () => Promise<void>;
  selectTemplate: (templateId: string) => Promise<void>;
  createTemplate: (template: Partial<Template>) => Promise<Template>;
  updateTemplate: (templateId: string, updates: Partial<Template>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (templateId: string, newName: string) => Promise<Template>;
  importTemplate: (path: string) => Promise<Template>;
  
  // Morph actions
  loadMorphPoints: (templateId: string) => Promise<void>;
  updateMorphConfig: (config: Partial<MorphConfig>) => void;
  validateMorphConfig: () => Promise<{ valid: boolean; errors: string[] }>;
  previewMorph: () => Promise<{ success: boolean; preview: string }>;
  
  // Instance actions
  loadInstances: (templateId?: string) => Promise<void>;
  createInstance: (templateId: string, config: MorphConfig) => Promise<TemplateInstance>;
  deleteInstance: (instanceId: string) => Promise<void>;
  
  // Filter actions
  setFilters: (filters: Partial<TemplateFilters>) => void;
  resetFilters: () => void;
  
  // Utility
  clearError: () => void;
}

const defaultFilters: TemplateFilters = {
  search: '',
  category: null,
  sortBy: 'updated',
  sortOrder: 'desc',
};

export const useTemplateStore = create<TemplateState>()(
  devtools(
    (set, get) => ({
      templates: [],
      selectedTemplate: null,
      morphPoints: [],
      morphConfig: null,
      instances: [],
      filters: defaultFilters,
      isLoading: false,
      error: null,

      // Template actions
      loadTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
          const templates = await window.api.templates.list();
          set({ templates, isLoading: false });
        } catch (error) {
          console.error('Failed to load templates:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load templates',
            isLoading: false,
          });
        }
      },

      selectTemplate: async (templateId: string) => {
        const { templates } = get();
        const template = templates.find((t) => t.id === templateId) || null;
        set({ selectedTemplate: template, morphConfig: null, morphPoints: [] });
        
        if (template) {
          await get().loadMorphPoints(templateId);
        }
      },

      createTemplate: async (template: Partial<Template>) => {
        set({ isLoading: true, error: null });
        try {
          const newTemplate = await window.api.templates.create(template);
          set((state) => ({
            templates: [...state.templates, newTemplate],
            isLoading: false,
          }));
          return newTemplate;
        } catch (error) {
          console.error('Failed to create template:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create template',
            isLoading: false,
          });
          throw error;
        }
      },

      updateTemplate: async (templateId: string, updates: Partial<Template>) => {
        try {
          await window.api.templates.update(templateId, updates);
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === templateId ? { ...t, ...updates, updatedAt: Date.now() } : t
            ),
            selectedTemplate:
              state.selectedTemplate?.id === templateId
                ? { ...state.selectedTemplate, ...updates }
                : state.selectedTemplate,
          }));
        } catch (error) {
          console.error('Failed to update template:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update template' });
        }
      },

      deleteTemplate: async (templateId: string) => {
        try {
          await window.api.templates.delete(templateId);
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== templateId),
            selectedTemplate:
              state.selectedTemplate?.id === templateId ? null : state.selectedTemplate,
          }));
        } catch (error) {
          console.error('Failed to delete template:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete template' });
        }
      },

      duplicateTemplate: async (templateId: string, newName: string) => {
        set({ isLoading: true, error: null });
        try {
          const duplicated = await window.api.templates.duplicate(templateId, newName);
          set((state) => ({
            templates: [...state.templates, duplicated],
            isLoading: false,
          }));
          return duplicated;
        } catch (error) {
          console.error('Failed to duplicate template:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to duplicate template',
            isLoading: false,
          });
          throw error;
        }
      },

      importTemplate: async (path: string) => {
        set({ isLoading: true, error: null });
        try {
          const imported = await window.api.templates.import(path);
          set((state) => ({
            templates: [...state.templates, imported],
            isLoading: false,
          }));
          return imported;
        } catch (error) {
          console.error('Failed to import template:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to import template',
            isLoading: false,
          });
          throw error;
        }
      },

      // Morph actions
      loadMorphPoints: async (templateId: string) => {
        try {
          const morphPoints = await window.api.templates.getMorphPoints(templateId);
          const defaultConfig: MorphConfig = {
            templateId,
            values: morphPoints.reduce((acc, mp) => {
              acc[mp.id] = mp.defaultValue;
              return acc;
            }, {} as Record<string, unknown>),
          };
          set({ morphPoints, morphConfig: defaultConfig });
        } catch (error) {
          console.error('Failed to load morph points:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load morph points' });
        }
      },

      updateMorphConfig: (config: Partial<MorphConfig>) => {
        set((state) => ({
          morphConfig: state.morphConfig
            ? { ...state.morphConfig, ...config }
            : null,
        }));
      },

      validateMorphConfig: async () => {
        const { morphConfig, morphPoints } = get();
        if (!morphConfig) {
          return { valid: false, errors: ['No morph configuration'] };
        }

        const errors: string[] = [];
        for (const mp of morphPoints) {
          if (mp.required && !morphConfig.values[mp.id]) {
            errors.push(`${mp.label} is required`);
          }
          if (mp.validation && morphConfig.values[mp.id]) {
            const regex = new RegExp(mp.validation);
            if (!regex.test(String(morphConfig.values[mp.id]))) {
              errors.push(`${mp.label} has invalid format`);
            }
          }
        }

        return { valid: errors.length === 0, errors };
      },

      previewMorph: async () => {
        const { selectedTemplate, morphConfig } = get();
        if (!selectedTemplate || !morphConfig) {
          return { success: false, preview: '' };
        }

        try {
          const preview = await window.api.templates.preview(
            selectedTemplate.id,
            morphConfig
          );
          return { success: true, preview };
        } catch (error) {
          console.error('Failed to preview morph:', error);
          return { success: false, preview: '' };
        }
      },

      // Instance actions
      loadInstances: async (templateId?: string) => {
        try {
          const instances = await window.api.templates.getInstances(templateId);
          set({ instances });
        } catch (error) {
          console.error('Failed to load instances:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load instances' });
        }
      },

      createInstance: async (templateId: string, config: MorphConfig) => {
        set({ isLoading: true, error: null });
        try {
          const instance = await window.api.templates.instantiate(templateId, config);
          set((state) => ({
            instances: [...state.instances, instance],
            isLoading: false,
          }));
          return instance;
        } catch (error) {
          console.error('Failed to create instance:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create instance',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteInstance: async (instanceId: string) => {
        try {
          await window.api.templates.deleteInstance(instanceId);
          set((state) => ({
            instances: state.instances.filter((i) => i.id !== instanceId),
          }));
        } catch (error) {
          console.error('Failed to delete instance:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete instance' });
        }
      },

      // Filter actions
      setFilters: (filters: Partial<TemplateFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
      },

      // Utility
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'TemplateStore' }
  )
);

export default useTemplateStore;
