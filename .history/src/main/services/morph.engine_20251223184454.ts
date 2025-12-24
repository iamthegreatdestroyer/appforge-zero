/**
 * Morph Engine Service - Transforms content based on morphing rules
 * Handles character, setting, and narrative transformations with AI assistance
 */

import {
  MorphInput,
  MorphOutput,
  MorphEngineService,
  TransformationAnalysis,
  MorphReplacement,
  MorphMetadata,
  TransformationIssue,
} from './types';

class MorphEngine implements MorphEngineService {
  /**
   * Transform character names and descriptions
   */
  async transformCharacters(input: MorphInput): Promise<MorphOutput> {
    const { originalContent, morphRules, context } = input;
    const replacements: MorphReplacement[] = [];
    let transformedContent = originalContent;

    // Apply character morphs
    for (const [charKey, morphRule] of Object.entries(
      morphRules.characters
    )) {
      const originalRegex = new RegExp(morphRule.originalName, 'gi');
      const matches = originalContent.match(originalRegex) || [];

      for (const match of matches) {
        transformedContent = transformedContent.replaceAll(
          match,
          morphRule.newName
        );

        replacements.push({
          original: match,
          replacement: morphRule.newName,
          type: 'character',
          confidence: 0.95,
        });
      }

      // Transform personality traits
      for (const [trait, description] of Object.entries(
        morphRule.personality || {}
      )) {
        const traitRegex = new RegExp(`\\b${trait}\\b`, 'gi');
        if (traitRegex.test(transformedContent)) {
          replacements.push({
            original: trait,
            replacement: description,
            type: 'character',
            confidence: 0.85,
          });
        }
      }
    }

    const metadata = this.analyzeTransformationMetadata(
      originalContent,
      transformedContent,
      replacements
    );

    return {
      transformedContent,
      replacements,
      metadata,
    };
  }

  /**
   * Transform setting descriptions
   */
  async transformSetting(input: MorphInput): Promise<MorphOutput> {
    const { originalContent, morphRules, context } = input;
    const replacements: MorphReplacement[] = [];
    let transformedContent = originalContent;

    // Apply setting morphs
    for (const [settingKey, morphRule] of Object.entries(
      morphRules.settings
    )) {
      const originalRegex = new RegExp(morphRule.originalSetting, 'gi');
      const matches = originalContent.match(originalRegex) || [];

      for (const match of matches) {
        transformedContent = transformedContent.replaceAll(
          match,
          morphRule.newSetting
        );

        replacements.push({
          original: match,
          replacement: morphRule.newSetting,
          type: 'setting',
          confidence: 0.92,
        });
      }

      // Transform characteristics
      for (const char of morphRule.characteristics || []) {
        const charRegex = new RegExp(`\\b${char}\\b`, 'i');
        if (charRegex.test(transformedContent)) {
          replacements.push({
            original: char,
            replacement: `[${context.targetSetting} ${char}]`,
            type: 'setting',
            confidence: 0.78,
          });
        }
      }
    }

    // Add temporal context
    if (context.targetEra) {
      const eraRegex = /era|time|period|age/gi;
      transformedContent = transformedContent.replace(
        eraRegex,
        `${context.targetEra} era`
      );

      replacements.push({
        original: 'temporal context',
        replacement: context.targetEra,
        type: 'setting',
        confidence: 0.88,
      });
    }

    const metadata = this.analyzeTransformationMetadata(
      originalContent,
      transformedContent,
      replacements
    );

    return {
      transformedContent,
      replacements,
      metadata,
    };
  }

  /**
   * Transform narrative elements
   */
  async transformNarrative(input: MorphInput): Promise<MorphOutput> {
    const { originalContent, morphRules, context } = input;
    const replacements: MorphReplacement[] = [];
    let transformedContent = originalContent;

    // Apply narrative morphs
    for (const [narrativeKey, morphRule] of Object.entries(
      morphRules.narrative
    )) {
      const themeRegex = new RegExp(morphRule.originalTheme, 'gi');
      const matches = originalContent.match(themeRegex) || [];

      for (const match of matches) {
        transformedContent = transformedContent.replaceAll(
          match,
          morphRule.newTheme
        );

        replacements.push({
          original: match,
          replacement: morphRule.newTheme,
          type: 'narrative',
          confidence: 0.88,
        });
      }

      // Transform tone
      if (morphRule.tone && context.tone) {
        const toneRegex = /tone|mood|atmosphere/gi;
        if (toneRegex.test(transformedContent)) {
          transformedContent = transformedContent.replace(
            toneRegex,
            `${context.tone} atmosphere`
          );

          replacements.push({
            original: 'tone',
            replacement: context.tone,
            type: 'narrative',
            confidence: 0.82,
          });
        }
      }

      // Transform conflicts
      for (const conflict of morphRule.conflicts || []) {
        const conflictRegex = new RegExp(`\\b${conflict}\\b`, 'i');
        if (conflictRegex.test(transformedContent)) {
          replacements.push({
            original: conflict,
            replacement: `[Conflict: ${conflict}]`,
            type: 'narrative',
            confidence: 0.85,
          });
        }
      }
    }

    const metadata = this.analyzeTransformationMetadata(
      originalContent,
      transformedContent,
      replacements
    );

    return {
      transformedContent,
      replacements,
      metadata,
    };
  }

  /**
   * Analyze a transformation for quality and consistency
   */
  async analyzeTransformation(
    output: MorphOutput
  ): Promise<TransformationAnalysis> {
    const { transformedContent, replacements, metadata } = output;

    // Calculate preservation ratio
    const preservationRatio = metadata.transformationScore;

    // Calculate originality score based on replacements
    const originalityScore = Math.min(
      1,
      replacements.length /
        Math.max(1, transformedContent.split(' ').length / 10)
    );

    // Identify issues
    const issues: TransformationIssue[] = [];

    // Check for incomplete transformations
    if (replacements.length === 0) {
      issues.push({
        type: 'consistency',
        description: 'No transformations were applied',
        severity: 'high',
      });
    }

    // Check for low confidence replacements
    const lowConfidenceCount = replacements.filter(
      (r) => r.confidence < 0.7
    ).length;
    if (lowConfidenceCount > replacements.length * 0.3) {
      issues.push({
        type: 'quality',
        description: `${lowConfidenceCount} replacements have low confidence`,
        severity: 'medium',
      });
    }

    // Check for plausibility
    if (metadata.preservedElements.length === 0) {
      issues.push({
        type: 'plausibility',
        description: 'No core elements were preserved from original',
        severity: 'high',
      });
    }

    // Generate suggestions
    const suggestions: string[] = [];

    if (preservationRatio < 0.5) {
      suggestions.push(
        'Consider preserving more core elements for better continuity'
      );
    }

    if (originalityScore > 0.8) {
      suggestions.push(
        'Transformation is very extensive, ensure coherence with original themes'
      );
    }

    if (issues.some((i) => i.severity === 'high')) {
      suggestions.push('Review high-severity issues before finalizing');
    }

    const score = Math.max(
      0,
      Math.min(1, (preservationRatio + originalityScore) / 2)
    );

    return {
      score,
      preservationRatio,
      originalityScore,
      issues,
      suggestions,
    };
  }

  /**
   * Analyze transformation metadata
   */
  private analyzeTransformationMetadata(
    original: string,
    transformed: string,
    replacements: MorphReplacement[]
  ): MorphMetadata {
    const originalWords = original.split(/\s+/).length;
    const transformedWords = transformed.split(/\s+/).length;

    // Calculate transformation score
    const averageConfidence =
      replacements.length > 0
        ? replacements.reduce((sum, r) => sum + r.confidence, 0) /
          replacements.length
        : 0;

    const transformationScore = Math.min(1, averageConfidence);

    // Identify preserved elements (unchanged text segments)
    const preservedElements = original
      .split(/\s+/)
      .filter((word) => transformed.includes(word));

    // Identify altered elements (transformed text)
    const alteredElements = replacements
      .map((r) => r.original)
      .slice(0, 10); // Top 10

    const estimatedQuality = Math.min(
      1,
      transformationScore * (1 - Math.abs(transformedWords - originalWords) / originalWords)
    );

    return {
      transformationScore,
      preservedElements: preservedElements.slice(0, 5),
      alteredElements,
      estimatedQuality,
    };
  }
}

export default new MorphEngine();
export { MorphEngine };
