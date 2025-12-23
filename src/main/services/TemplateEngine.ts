/**
 * TemplateEngine.ts - Core Template Morphing Engine
 * 
 * Handles template loading, validation, and instantiation with Handlebars morphing.
 * Emits events for progress tracking and error handling.
 */

import { EventEmitter } from 'events';
import * as yaml from 'yaml';
import Handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single morph point within a template
 */
export interface MorphPoint {
  id: string;
  type: 'text' | 'color' | 'image' | 'resource' | 'string' | 'layout';
  path: string;
  pattern: string;
  required: boolean;
  default?: string;
}

/**
 * Template metadata and configuration
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  morphPoints: MorphPoint[];
  basePath: string;
  previewImage?: string;
  tags: string[];
  minSdkVersion: number;
  targetSdkVersion: number;
}

/**
 * Configuration values for morphing a template
 */
export interface MorphConfig {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  values: Record<string, string | number | boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TemplateEngine Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core engine for loading, validating, and instantiating templates
 * 
 * @fires TemplateEngine#template:loaded - When a template is successfully loaded
 * @fires TemplateEngine#morph:start - When morphing begins
 * @fires TemplateEngine#morph:progress - Progress updates during morphing
 * @fires TemplateEngine#morph:complete - When morphing completes successfully
 * @fires TemplateEngine#error - When an error occurs
 */
export class TemplateEngine extends EventEmitter {
  private templatesDir: string;
  private templates: Map<string, Template> = new Map();
  private handlebars: typeof Handlebars;

  constructor(templatesDir: string) {
    super();
    this.templatesDir = templatesDir;
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers for template morphing
   */
  private registerHelpers(): void {
    // Convert string to lowercase
    this.handlebars.registerHelper('lowercase', (str: string) => 
      str?.toLowerCase() ?? ''
    );

    // Convert string to uppercase
    this.handlebars.registerHelper('uppercase', (str: string) => 
      str?.toUpperCase() ?? ''
    );

    // Convert to camelCase
    this.handlebars.registerHelper('camelCase', (str: string) => {
      if (!str) return '';
      return str.replace(/[-_\s]+(.)?/g, (_, c) => c?.toUpperCase() ?? '');
    });

    // Convert to PascalCase
    this.handlebars.registerHelper('pascalCase', (str: string) => {
      if (!str) return '';
      const camel = str.replace(/[-_\s]+(.)?/g, (_, c) => c?.toUpperCase() ?? '');
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    // Convert to snake_case
    this.handlebars.registerHelper('snakeCase', (str: string) => {
      if (!str) return '';
      return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    });

    // Safe package name (replace invalid characters)
    this.handlebars.registerHelper('safePackage', (str: string) => {
      if (!str) return '';
      return str.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
    });

    // Android resource name (lowercase, underscores)
    this.handlebars.registerHelper('resourceName', (str: string) => {
      if (!str) return '';
      return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    });
  }

  /**
   * Load all templates from the templates directory
   */
  async loadTemplates(): Promise<void> {
    this.templates.clear();
    const templateDirs = await fs.readdir(this.templatesDir);

    for (const dir of templateDirs) {
      const templatePath = path.join(this.templatesDir, dir);
      const stat = await fs.stat(templatePath);

      if (stat.isDirectory()) {
        try {
          const template = await this.loadTemplate(templatePath);
          this.templates.set(template.id, template);
          this.emit('template:loaded', template);
        } catch (error) {
          this.emit('error', { 
            type: 'template:load', 
            path: templatePath, 
            error 
          });
        }
      }
    }
  }

  /**
   * Load a single template from its directory
   */
  private async loadTemplate(templatePath: string): Promise<Template> {
    const morphYamlPath = path.join(templatePath, 'morph.yaml');

    if (!await fs.pathExists(morphYamlPath)) {
      throw new Error(`morph.yaml not found in ${templatePath}`);
    }

    const morphContent = await fs.readFile(morphYamlPath, 'utf-8');
    const morphData = yaml.parse(morphContent);

    const template: Template = {
      id: morphData.id || path.basename(templatePath),
      name: morphData.name,
      description: morphData.description || '',
      category: morphData.category || 'general',
      version: morphData.version || '1.0.0',
      author: morphData.author || 'Unknown',
      morphPoints: this.parseMorphPoints(morphData.morph_points || []),
      basePath: templatePath,
      previewImage: morphData.preview_image 
        ? path.join(templatePath, morphData.preview_image) 
        : undefined,
      tags: morphData.tags || [],
      minSdkVersion: morphData.min_sdk_version || 21,
      targetSdkVersion: morphData.target_sdk_version || 34,
    };

    return template;
  }

  /**
   * Parse morph points from YAML data
   */
  private parseMorphPoints(points: any[]): MorphPoint[] {
    return points.map((point) => ({
      id: point.id,
      type: point.type || 'text',
      path: point.path,
      pattern: point.pattern,
      required: point.required ?? true,
      default: point.default,
    }));
  }

  /**
   * Get list of all available templates
   */
  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): Template | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Validate a morph configuration against a template
   */
  validateMorphConfig(template: Template, config: MorphConfig): string[] {
    const errors: string[] = [];

    // Validate required morph points
    for (const point of template.morphPoints) {
      if (point.required && !config.values[point.id] && !point.default) {
        errors.push(`Missing required value for morph point: ${point.id}`);
      }
    }

    // Validate package name format
    const packageRegex = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
    if (!packageRegex.test(config.packageName)) {
      errors.push('Invalid package name format. Must be like: com.example.app');
    }

    // Validate version code
    if (config.versionCode < 1) {
      errors.push('Version code must be a positive integer');
    }

    // Validate app name
    if (!config.appName || config.appName.trim().length === 0) {
      errors.push('App name is required');
    }

    return errors;
  }

  /**
   * Instantiate a template with the given configuration
   * Creates a new project in the output directory
   */
  async instantiate(
    templateId: string,
    config: MorphConfig,
    outputDir: string
  ): Promise<string> {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate configuration
    const validationErrors = this.validateMorphConfig(template, config);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);
    }

    this.emit('morph:start', { templateId, config });

    // Create output directory
    await fs.ensureDir(outputDir);

    // Copy template files
    const srcPath = path.join(template.basePath, 'src');
    await fs.copy(srcPath, outputDir, {
      filter: (src) => !src.includes('.git'),
    });

    // Apply morph points
    let processed = 0;
    const total = template.morphPoints.length;

    for (const point of template.morphPoints) {
      const value = config.values[point.id] ?? point.default;
      await this.applyMorphPoint(outputDir, point, value, config);

      processed++;
      this.emit('morph:progress', {
        current: processed,
        total,
        point: point.id,
      });
    }

    // Apply global substitutions (package name, app name, versions)
    await this.applyGlobalSubstitutions(outputDir, config);

    this.emit('morph:complete', { outputDir });
    return outputDir;
  }

  /**
   * Apply a single morph point to the project
   */
  private async applyMorphPoint(
    projectPath: string,
    point: MorphPoint,
    value: any,
    config: MorphConfig
  ): Promise<void> {
    const targetPath = path.join(projectPath, point.path);

    switch (point.type) {
      case 'text':
      case 'string':
        await this.applyTextMorph(targetPath, point.pattern, value);
        break;
      case 'color':
        await this.applyColorMorph(targetPath, point.pattern, value);
        break;
      case 'image':
        await this.applyImageMorph(targetPath, value);
        break;
      case 'resource':
        await this.applyResourceMorph(targetPath, point.pattern, value, config);
        break;
      case 'layout':
        await this.applyLayoutMorph(targetPath, point.pattern, value);
        break;
    }
  }

  /**
   * Apply text replacement morph
   */
  private async applyTextMorph(
    filePath: string,
    pattern: string,
    value: string
  ): Promise<void> {
    if (!await fs.pathExists(filePath)) {
      return;
    }

    let content = await fs.readFile(filePath, 'utf-8');
    const regex = new RegExp(pattern, 'g');
    content = content.replace(regex, value);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Apply color replacement morph
   */
  private async applyColorMorph(
    filePath: string,
    pattern: string,
    colorValue: string
  ): Promise<void> {
    // Ensure color has proper format (#RRGGBB or #AARRGGBB)
    const normalizedColor = colorValue.startsWith('#') 
      ? colorValue 
      : `#${colorValue}`;

    await this.applyTextMorph(filePath, pattern, normalizedColor);
  }

  /**
   * Apply image replacement morph
   */
  private async applyImageMorph(
    targetPath: string,
    sourcePath: string
  ): Promise<void> {
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
  }

  /**
   * Apply Android resource morph
   */
  private async applyResourceMorph(
    filePath: string,
    pattern: string,
    value: string,
    config: MorphConfig
  ): Promise<void> {
    const template = this.handlebars.compile(value);
    const renderedValue = template({
      ...config,
      ...config.values,
    });
    await this.applyTextMorph(filePath, pattern, renderedValue);
  }

  /**
   * Apply layout XML morph
   */
  private async applyLayoutMorph(
    filePath: string,
    pattern: string,
    value: string
  ): Promise<void> {
    await this.applyTextMorph(filePath, pattern, value);
  }

  /**
   * Apply global substitutions across all project files
   */
  private async applyGlobalSubstitutions(
    projectPath: string,
    config: MorphConfig
  ): Promise<void> {
    const substitutions = {
      '{{APP_NAME}}': config.appName,
      '{{PACKAGE_NAME}}': config.packageName,
      '{{VERSION_NAME}}': config.versionName,
      '{{VERSION_CODE}}': String(config.versionCode),
    };

    const files = await this.getAllFiles(projectPath);

    for (const file of files) {
      // Skip binary files
      if (this.isBinaryFile(file)) {
        continue;
      }

      let content = await fs.readFile(file, 'utf-8');
      let modified = false;

      for (const [pattern, value] of Object.entries(substitutions)) {
        if (content.includes(pattern)) {
          content = content.replace(new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'), value);
          modified = true;
        }
      }

      if (modified) {
        await fs.writeFile(file, content, 'utf-8');
      }
    }

    // Rename directories for package structure
    await this.reorganizePackageStructure(projectPath, config.packageName);
  }

  /**
   * Recursively get all files in a directory
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if a file is binary
   */
  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
      '.mp3', '.mp4', '.wav', '.ogg',
      '.zip', '.jar', '.aar', '.apk',
      '.ttf', '.otf', '.woff', '.woff2',
      '.so', '.dll', '.exe',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  /**
   * Reorganize Java/Kotlin source files to match package structure
   */
  private async reorganizePackageStructure(
    projectPath: string,
    packageName: string
  ): Promise<void> {
    const packagePath = packageName.replace(/\./g, path.sep);
    const javaSrcDir = path.join(projectPath, 'app', 'src', 'main', 'java');
    const kotlinSrcDir = path.join(projectPath, 'app', 'src', 'main', 'kotlin');

    // Handle Java sources
    if (await fs.pathExists(javaSrcDir)) {
      await this.movePackageSources(javaSrcDir, packagePath);
    }

    // Handle Kotlin sources
    if (await fs.pathExists(kotlinSrcDir)) {
      await this.movePackageSources(kotlinSrcDir, packagePath);
    }
  }

  /**
   * Move source files to proper package directory
   */
  private async movePackageSources(
    srcDir: string,
    packagePath: string
  ): Promise<void> {
    const templatePackageDir = path.join(srcDir, 'com', 'template', 'app');
    const targetPackageDir = path.join(srcDir, packagePath);

    if (await fs.pathExists(templatePackageDir)) {
      await fs.ensureDir(path.dirname(targetPackageDir));
      await fs.move(templatePackageDir, targetPackageDir, { overwrite: true });

      // Clean up empty template directories
      await this.removeEmptyDirs(path.join(srcDir, 'com'));
    }
  }

  /**
   * Remove empty directories recursively
   */
  private async removeEmptyDirs(dir: string): Promise<void> {
    if (!await fs.pathExists(dir)) {
      return;
    }

    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await this.removeEmptyDirs(fullPath);
      }
    }

    // Check if directory is now empty
    const remaining = await fs.readdir(dir);
    if (remaining.length === 0) {
      await fs.rmdir(dir);
    }
  }
}

export default TemplateEngine;
