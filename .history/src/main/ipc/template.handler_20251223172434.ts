/**
 * Template IPC Handler - Manages all template-related IPC communications
 * Handles template listing, retrieval, validation, and instantiation
 */

import { ipcMain, IpcMainEvent } from 'electron';
import {
  IPC_TemplateListRequest,
  IPC_TemplateListResponse,
  IPC_TemplateGetRequest,
  IPC_TemplateGetResponse,
  IPC_TemplateValidateRequest,
  IPC_TemplateValidateResponse,
  IPC_TemplateInstantiateRequest,
  IPC_TemplateInstantiateResponse,
  IPC_ErrorResponse,
} from './types';

// Simulated template database
const TEMPLATE_DATABASE: Record<string, any> = {
  'template-1': {
    id: 'template-1',
    title: 'Space Colony Lucy',
    description: 'Lucy Ricardo reimagined in 2157 space colony',
    category: 'SciFi',
    createdAt: new Date().toISOString(),
    usageCount: 24,
    rating: 4.8,
    morphTransformation: {
      characters: {
        lucy: {
          originalName: 'Lucy Ricardo',
          newName: 'Luna',
          traits: ['ambitious', 'scheming', 'endearing'],
          setting: 'space colony',
        },
      },
      settings: {
        era: 2157,
        location: 'Luna Prime Station',
        environment: 'orbital habitat',
      },
      narrative: {
        theme: 'scifi-comedy',
        tone: 'witty and adventurous',
      },
    },
  },
  'template-2': {
    id: 'template-2',
    title: 'Magical Forest Andy',
    description: 'Andy Griffith Show characters in enchanted forest',
    category: 'Fantasy',
    createdAt: new Date().toISOString(),
    usageCount: 18,
    rating: 4.6,
    morphTransformation: {
      characters: {
        andy: {
          originalName: 'Andy Griffith',
          newName: 'Andrew of the Hollow',
          traits: ['wise', 'calm', 'fair'],
          setting: 'magical forest',
        },
      },
      settings: {
        era: 'timeless',
        location: 'Whispering Hollow',
        environment: 'enchanted forest with magical creatures',
      },
      narrative: {
        theme: 'fantasy-wholesome',
        tone: 'mystical and gentle',
      },
    },
  },
};

class TemplateIPCHandler {
  /**
   * Register all template-related IPC handlers
   */
  static register(): void {
    ipcMain.handle('template:list', this.handleList);
    ipcMain.handle('template:get', this.handleGet);
    ipcMain.handle('template:validate', this.handleValidate);
    ipcMain.handle('template:instantiate', this.handleInstantiate);

    console.log('[IPC] Template handlers registered');
  }

  /**
   * Handle template list request
   */
  static async handleList(
    event: IpcMainEvent,
    request: IPC_TemplateListRequest
  ): Promise<IPC_TemplateListResponse | IPC_ErrorResponse> {
    try {
      const {
        category,
        searchQuery,
        sortBy = 'name',
        limit = 10,
        offset = 0,
      } = request;

      // Filter templates
      let filtered = Object.values(TEMPLATE_DATABASE);

      if (category) {
        filtered = filtered.filter((t) => t.category === category);
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'dateAdded':
            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            );
          case 'popularity':
            return b.usageCount - a.usageCount;
          case 'name':
          default:
            return a.title.localeCompare(b.title);
        }
      });

      const total = filtered.length;
      const templates = filtered.slice(offset, offset + limit).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        createdAt: t.createdAt,
        usageCount: t.usageCount,
        rating: t.rating,
      }));

      return {
        templates,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('[IPC] Error in template:list:', error);
      return {
        error: true,
        code: 'TEMPLATE_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle get single template request
   */
  static async handleGet(
    event: IpcMainEvent,
    request: IPC_TemplateGetRequest
  ): Promise<IPC_TemplateGetResponse | IPC_ErrorResponse> {
    try {
      const { templateId } = request;

      if (!templateId) {
        return {
          error: true,
          code: 'INVALID_REQUEST',
          message: 'templateId is required',
        };
      }

      const template = TEMPLATE_DATABASE[templateId];

      if (!template) {
        return {
          error: true,
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with ID '${templateId}' not found`,
        };
      }

      return {
        id: template.id,
        title: template.title,
        description: template.description,
        category: template.category,
        createdAt: template.createdAt,
        morphTransformation: template.morphTransformation,
        usageCount: template.usageCount,
        rating: template.rating,
        previewUrl: `/preview/${template.id}`,
      };
    } catch (error) {
      console.error('[IPC] Error in template:get:', error);
      return {
        error: true,
        code: 'TEMPLATE_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle template validation request
   */
  static async handleValidate(
    event: IpcMainEvent,
    request: IPC_TemplateValidateRequest
  ): Promise<IPC_TemplateValidateResponse | IPC_ErrorResponse> {
    try {
      const { title, description, category, morphTransformation } = request;
      const errors: Array<{ field: string; message: string }> = [];
      const warnings: Array<{ field: string; message: string }> = [];

      // Validate required fields
      if (!title || title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      } else if (title.length > 100) {
        warnings.push({
          field: 'title',
          message: 'Title exceeds recommended length (100 chars)',
        });
      }

      if (!description || description.trim().length === 0) {
        errors.push({
          field: 'description',
          message: 'Description is required',
        });
      }

      if (!category || category.trim().length === 0) {
        errors.push({ field: 'category', message: 'Category is required' });
      }

      // Validate morphTransformation structure
      if (!morphTransformation) {
        errors.push({
          field: 'morphTransformation',
          message: 'Morph transformation is required',
        });
      } else {
        if (!morphTransformation.characters) {
          errors.push({
            field: 'morphTransformation.characters',
            message: 'Characters transformation is required',
          });
        }
        if (!morphTransformation.settings) {
          errors.push({
            field: 'morphTransformation.settings',
            message: 'Settings transformation is required',
          });
        }
        if (!morphTransformation.narrative) {
          errors.push({
            field: 'morphTransformation.narrative',
            message: 'Narrative transformation is required',
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('[IPC] Error in template:validate:', error);
      return {
        error: true,
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle template instantiation (create app from template)
   */
  static async handleInstantiate(
    event: IpcMainEvent,
    request: IPC_TemplateInstantiateRequest
  ): Promise<IPC_TemplateInstantiateResponse | IPC_ErrorResponse> {
    try {
      const { templateId, appTitle, customizations } = request;

      if (!templateId) {
        return {
          error: true,
          code: 'INVALID_REQUEST',
          message: 'templateId is required',
        };
      }

      if (!appTitle) {
        return {
          error: true,
          code: 'INVALID_REQUEST',
          message: 'appTitle is required',
        };
      }

      const template = TEMPLATE_DATABASE[templateId];
      if (!template) {
        return {
          error: true,
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with ID '${templateId}' not found`,
        };
      }

      // Generate IDs
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const appId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate job processing
      console.log(
        `[IPC] Instantiating template '${templateId}' as app '${appTitle}' (jobId: ${jobId})`
      );

      // In a real implementation, this would queue an actual build job
      setTimeout(() => {
        console.log(`[IPC] Job ${jobId} completed`);
      }, 5000);

      return {
        jobId,
        appId,
        status: 'queued',
        timestamp: Date.now(),
        estimatedTime: 5000,
      };
    } catch (error) {
      console.error('[IPC] Error in template:instantiate:', error);
      return {
        error: true,
        code: 'INSTANTIATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default TemplateIPCHandler;
