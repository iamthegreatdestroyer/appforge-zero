/**
 * Renderer-side template types used by UI components.
 * These mirror the service-layer Template but are shaped for the renderer.
 */

export interface MorphTransformation {
  characters: Record<string, string | Record<string, unknown>>;
  settings: Record<string, string | Record<string, unknown>>;
  narrative: Record<string, string | Record<string, unknown>>;
}

export interface Template {
  id: string;
  title: string;
  description?: string;
  category: string;
  createdAt: string;
  usageCount?: number;
  rating?: number;
  thumbnail?: string;
  morphTransformation: MorphTransformation;
}
