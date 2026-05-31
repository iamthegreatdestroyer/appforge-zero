/**
 * Renderer template store — used by TemplateGrid, MorphConfigPanel, etc.
 * (components import from ../../store/templateStore relative to their dir)
 */

import { create } from 'zustand';
import type { Template, MorphTransformation } from '../types/template';

interface TemplateState {
  templates: Template[];
  selectedTemplate: string | null;
  isLoading: boolean;
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplate: (id: string | null) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,

  setTemplates: (templates) => set({ templates }),

  setSelectedTemplate: (id) => set({ selectedTemplate: id }),

  updateTemplate: (id, updates) =>
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
}));

export default useTemplateStore;
