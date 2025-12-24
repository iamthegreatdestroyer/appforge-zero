/**
 * Template Engine Service - Manages template loading, validation, and storage
 * Provides core template management functionality
 */

import {
  Template,
  TemplateEngineService,
  TemplateFilters,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./types";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * In-memory template database for demo
 * In production, this would be replaced with SQLite/PostgreSQL
 */
const TEMPLATE_DATABASE: Map<string, Template> = new Map([
  [
    "template-1",
    {
      id: "template-1",
      title: "Space Colony Lucy",
      description:
        "Lucy Ricardo reimagined as Luna, an ambitious space colonist in 2157",
      category: "SciFi",
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
      version: "1.0.0",
      metadata: {
        author: "AppForge Demo",
        tags: ["scifi", "comedy", "space", "original-series"],
        compatibility: ["Android", "iOS"],
      },
      morphTransformation: {
        characters: {
          lucy: {
            originalName: "Lucy Ricardo",
            newName: "Luna",
            traits: ["ambitious", "scheming", "endearing", "adventurous"],
            personality: {
              humor: "witty",
              courage: "bold",
              intelligence: "clever",
            },
            relationships: {
              ricky: "commanding officer",
              ethel: "crew chief",
            },
          },
        },
        settings: {
          apartment: {
            originalSetting: "Manhattan apartment",
            newSetting: "Space station quarters",
            era: "2157",
            characteristics: [
              "advanced technology",
              "zero gravity adaptations",
              "compact",
            ],
            environment: "orbital habitat",
          },
        },
        narrative: {
          theme: {
            originalTheme: "Marital comedy",
            newTheme: "Space exploration and discovery",
            tone: "witty, adventurous, optimistic",
            conflicts: [
              "Zero-G mishaps",
              "alien encounters",
              "equipment failures",
            ],
            resolution: "teamwork and ingenuity",
          },
        },
      },
      stats: {
        downloads: 245,
        rating: 4.8,
        reviews: 18,
      },
    },
  ],
  [
    "template-2",
    {
      id: "template-2",
      title: "Magical Forest Andy",
      description:
        "Andy Griffith show characters in an enchanted forest setting",
      category: "Fantasy",
      createdAt: new Date(Date.now() - 60 * 86400000),
      updatedAt: new Date(),
      version: "1.0.0",
      metadata: {
        author: "AppForge Demo",
        tags: ["fantasy", "wholesome", "magical", "classic"],
        compatibility: ["Android", "iOS"],
      },
      morphTransformation: {
        characters: {
          andy: {
            originalName: "Andy Griffith",
            newName: "Andrew of the Hollow",
            traits: ["wise", "calm", "fair", "protective"],
            personality: {
              wisdom: "sage",
              patience: "infinite",
              kindness: "genuine",
            },
            relationships: {
              barney: "wood guardian",
              mayberry: "forest village",
            },
          },
        },
        settings: {
          mayberry: {
            originalSetting: "Small Southern town",
            newSetting: "Whispering Hollow forest village",
            era: "timeless",
            characteristics: [
              "magical creatures",
              "ancient trees",
              "mystical atmosphere",
            ],
            environment: "enchanted forest",
          },
        },
        narrative: {
          theme: {
            originalTheme: "Small-town morality",
            newTheme: "Forest harmony and balance",
            tone: "mystical, gentle, reflective",
            conflicts: [
              "Dark magic threats",
              "creature protection",
              "forest preservation",
            ],
            resolution: "wisdom and compassion",
          },
        },
      },
      stats: {
        downloads: 189,
        rating: 4.6,
        reviews: 14,
      },
    },
  ],
]);

class TemplateEngine implements TemplateEngineService {
  /**
   * Load a single template by ID
   */
  async loadTemplate(templateId: string): Promise<Template> {
    const template = TEMPLATE_DATABASE.get(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return JSON.parse(JSON.stringify(template));
  }

  /**
   * List templates with filtering and pagination
   */
  async listTemplates(filters: TemplateFilters): Promise<Template[]> {
    const {
      category,
      searchQuery,
      sortBy = "name",
      limit = 10,
      offset = 0,
    } = filters;

    let templates = Array.from(TEMPLATE_DATABASE.values());

    // Filter by category
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.metadata.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    templates.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.stats.rating - a.stats.rating;
        case "downloads":
          return b.stats.downloads - a.stats.downloads;
        case "recent":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "name":
        default:
          return a.title.localeCompare(b.title);
      }
    });

    // Paginate
    return templates.slice(offset, offset + limit).map((t) => ({
      ...t,
    }));
  }

  /**
   * Validate template structure
   */
  async validateTemplate(
    template: Partial<Template>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!template.title || template.title.trim().length === 0) {
      errors.push({
        field: "title",
        message: "Title is required",
        severity: "error",
      });
    } else if (template.title.length > 100) {
      warnings.push({
        field: "title",
        message: "Title exceeds 100 characters",
        severity: "warning",
      });
    }

    if (!template.description || template.description.trim().length === 0) {
      errors.push({
        field: "description",
        message: "Description is required",
        severity: "error",
      });
    }

    if (!template.category || template.category.trim().length === 0) {
      errors.push({
        field: "category",
        message: "Category is required",
        severity: "error",
      });
    }

    // Validate morph transformation
    if (!template.morphTransformation) {
      errors.push({
        field: "morphTransformation",
        message: "Morph transformation is required",
        severity: "error",
      });
    } else {
      const { morphTransformation } = template;

      if (
        !morphTransformation.characters ||
        Object.keys(morphTransformation.characters).length === 0
      ) {
        errors.push({
          field: "morphTransformation.characters",
          message: "At least one character transformation is required",
          severity: "error",
        });
      }

      if (
        !morphTransformation.settings ||
        Object.keys(morphTransformation.settings).length === 0
      ) {
        errors.push({
          field: "morphTransformation.settings",
          message: "At least one setting transformation is required",
          severity: "error",
        });
      }

      if (
        !morphTransformation.narrative ||
        Object.keys(morphTransformation.narrative).length === 0
      ) {
        warnings.push({
          field: "morphTransformation.narrative",
          message: "Consider adding narrative transformations",
          severity: "warning",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Save or update a template
   */
  async saveTemplate(template: Template): Promise<string> {
    // Validate before saving
    const validation = await this.validateTemplate(template);

    if (!validation.valid) {
      throw new Error(
        `Template validation failed: ${validation.errors.map((e) => e.message).join(", ")}`
      );
    }

    const id = template.id || `template-${Date.now()}`;
    const now = new Date();

    const templateToSave: Template = {
      ...template,
      id,
      createdAt: template.createdAt || now,
      updatedAt: now,
    };

    TEMPLATE_DATABASE.set(id, templateToSave);

    console.log(`[TemplateEngine] Template saved: ${id}`);

    return id;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (!TEMPLATE_DATABASE.has(templateId)) {
      throw new Error(`Template not found: ${templateId}`);
    }

    TEMPLATE_DATABASE.delete(templateId);
    console.log(`[TemplateEngine] Template deleted: ${templateId}`);
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    downloads: number;
    rating: number;
    reviews: number;
  }> {
    const template = await this.loadTemplate(templateId);
    return template.stats;
  }

  /**
   * Update template rating
   */
  async updateRating(templateId: string, newRating: number): Promise<void> {
    const template = TEMPLATE_DATABASE.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Update rating (weighted average)
    const { rating, reviews } = template.stats;
    const newReviews = reviews + 1;
    const newAverageRating = (rating * reviews + newRating) / newReviews;

    template.stats.rating = Math.min(5, newAverageRating);
    template.stats.reviews = newReviews;

    console.log(
      `[TemplateEngine] Rating updated for ${templateId}: ${template.stats.rating}`
    );
  }
}

export default new TemplateEngine();
export { TemplateEngine };
