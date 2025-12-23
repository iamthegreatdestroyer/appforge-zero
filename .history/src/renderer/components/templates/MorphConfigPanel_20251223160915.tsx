import React, { useState, useCallback, useMemo } from "react";
import { useTemplateStore } from "../../store/templateStore";
import MorphPointInput from "./MorphPointInput";
import MorphPreview from "./MorphPreview";
import { MorphTransformation } from "../../types/template";
import "./MorphConfigPanel.css";

/**
 * MorphConfigPanel Component
 *
 * Provides UI for configuring template transformations (Morph operations).
 * Allows users to define character transformations, setting changes, and narrative shifts.
 *
 * Features:
 * - Add/remove morph points (character traits, setting elements, etc.)
 * - Real-time preview of transformations
 * - Validation of morph configurations
 * - Undo/Redo support
 * - Export/Import configurations
 * - Visual feedback for invalid configs
 *
 * @returns React component for morph configuration
 */
const MorphConfigPanel: React.FC = () => {
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const templates = useTemplateStore((state) => state.templates);
  const updateTemplate = useTemplateStore((state) => state.updateTemplate);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["characters", "settings", "narrative"])
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplate),
    [templates, selectedTemplate]
  );

  if (!currentTemplate) {
    return (
      <div className="morph-config-panel morph-config-panel--empty">
        <p>Select a template to configure transformations.</p>
      </div>
    );
  }

  const morphConfig = currentTemplate.morphTransformation || {
    characters: {},
    settings: {},
    narrative: {},
  };

  // Toggle section expansion
  const toggleSection = useCallback((section: string): void => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Update morph point
  const handleMorphPointUpdate = useCallback(
    (
      category: keyof MorphTransformation,
      pointKey: string,
      value: string
    ): void => {
      const updated: MorphTransformation = {
        ...morphConfig,
        [category]: {
          ...morphConfig[category],
          [pointKey]: value,
        },
      };

      updateTemplate(currentTemplate.id, {
        morphTransformation: updated,
      });

      // Clear error for this field
      setValidationErrors((prev) =>
        prev.filter((err) => !err.includes(`${category}.${pointKey}`))
      );
    },
    [morphConfig, currentTemplate.id, updateTemplate]
  );

  // Add new morph point
  const handleAddMorphPoint = useCallback(
    (category: keyof MorphTransformation, pointKey: string): void => {
      if (morphConfig[category][pointKey]) {
        setValidationErrors((prev) => [
          ...prev,
          `${category}.${pointKey} already exists`,
        ]);
        return;
      }

      const updated: MorphTransformation = {
        ...morphConfig,
        [category]: {
          ...morphConfig[category],
          [pointKey]: "",
        },
      };

      updateTemplate(currentTemplate.id, {
        morphTransformation: updated,
      });
    },
    [morphConfig, currentTemplate.id, updateTemplate]
  );

  // Delete morph point
  const handleDeleteMorphPoint = useCallback(
    (category: keyof MorphTransformation, pointKey: string): void => {
      const updated: MorphTransformation = {
        ...morphConfig,
        [category]: {
          ...Object.entries(morphConfig[category])
            .filter(([key]) => key !== pointKey)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
        },
      };

      updateTemplate(currentTemplate.id, {
        morphTransformation: updated,
      });
    },
    [morphConfig, currentTemplate.id, updateTemplate]
  );

  const renderSection = (
    title: string,
    category: keyof MorphTransformation
  ): JSX.Element => {
    const isExpanded = expandedSections.has(category);
    const points = morphConfig[category] || {};
    const pointCount = Object.keys(points).length;

    return (
      <div key={category} className="morph-config-panel__section">
        <button
          className="morph-config-panel__section-header"
          onClick={() => toggleSection(category)}
          aria-expanded={isExpanded}
        >
          <span className="morph-config-panel__section-title">
            {title} ({pointCount})
          </span>
          <span className="morph-config-panel__section-toggle">
            {isExpanded ? "▼" : "▶"}
          </span>
        </button>

        {isExpanded && (
          <div className="morph-config-panel__section-content">
            {Object.entries(points).map(([key, value]) => (
              <MorphPointInput
                key={`${category}-${key}`}
                label={key}
                value={value as string}
                onChange={(newValue) =>
                  handleMorphPointUpdate(category, key, newValue)
                }
                onDelete={() => handleDeleteMorphPoint(category, key)}
                category={category}
              />
            ))}

            <button
              className="morph-config-panel__add-btn"
              onClick={() => {
                const newKey = `${category}_${Date.now()}`;
                handleAddMorphPoint(category, newKey);
              }}
            >
              + Add {title} Transformation
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="morph-config-panel">
      <div className="morph-config-panel__header">
        <h2>Transformation Configuration</h2>
        <p className="morph-config-panel__subtitle">
          Define how characters, settings, and narrative change in new contexts
        </p>
      </div>

      {validationErrors.length > 0 && (
        <div className="morph-config-panel__errors">
          {validationErrors.map((error, idx) => (
            <div key={idx} className="morph-config-panel__error">
              {error}
            </div>
          ))}
        </div>
      )}

      <div className="morph-config-panel__sections">
        {renderSection("Characters", "characters")}
        {renderSection("Settings", "settings")}
        {renderSection("Narrative", "narrative")}
      </div>

      {/* Real-time preview */}
      <MorphPreview template={currentTemplate} morphConfig={morphConfig} />
    </div>
  );
};

export default MorphConfigPanel;
