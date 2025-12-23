import React, { useMemo } from "react";
import { Template, MorphTransformation } from "../../types/template";
import "./MorphPreview.css";

interface MorphPreviewProps {
  template: Template;
  morphConfig: MorphTransformation;
}

/**
 * MorphPreview Component
 *
 * Displays a real-time preview of how the template will be transformed
 * based on the current morph configuration.
 *
 * Features:
 * - Live update as config changes
 * - Shows original vs. transformed examples
 * - Validation of completeness
 * - Visual indicators for filled/empty sections
 * - Scrollable preview area
 *
 * @param template - Template to preview
 * @param morphConfig - Current morph transformation config
 * @returns React component displaying transformation preview
 */
const MorphPreview: React.FC<MorphPreviewProps> = ({
  template,
  morphConfig,
}) => {
  const completionMetrics = useMemo(() => {
    const calculateCompletion = (section: Record<string, unknown>): number => {
      const entries = Object.entries(section);
      if (entries.length === 0) return 0;
      const filled = entries.filter(
        ([, value]) => value && String(value).trim()
      ).length;
      return Math.round((filled / entries.length) * 100);
    };

    return {
      characters: calculateCompletion(morphConfig.characters || {}),
      settings: calculateCompletion(morphConfig.settings || {}),
      narrative: calculateCompletion(morphConfig.narrative || {}),
      overall: Math.round(
        ((calculateCompletion(morphConfig.characters || {}) +
          calculateCompletion(morphConfig.settings || {}) +
          calculateCompletion(morphConfig.narrative || {})) /
          3) *
          100
      ),
    };
  }, [morphConfig]);

  const totalTransformations =
    Object.keys(morphConfig.characters || {}).length +
    Object.keys(morphConfig.settings || {}).length +
    Object.keys(morphConfig.narrative || {}).length;

  const renderSection = (title: string, items: Record<string, unknown>) => {
    const entries = Object.entries(items);
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="morph-preview__section">
        <h4 className="morph-preview__section-title">{title}</h4>
        <ul className="morph-preview__list">
          {entries.map(([key, value]) => (
            <li key={key} className="morph-preview__list-item">
              <span className="morph-preview__list-key">{key}:</span>
              <span className="morph-preview__list-value">
                {value && String(value).trim() ? (
                  <>
                    <span className="morph-preview__checkmark">✓</span>
                    {String(value).substring(0, 50)}
                    {String(value).length > 50 ? "..." : ""}
                  </>
                ) : (
                  <span className="morph-preview__empty">(Not configured)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="morph-preview">
      <div className="morph-preview__header">
        <h3>Transformation Preview</h3>
        <span className="morph-preview__summary">
          {totalTransformations} transformation
          {totalTransformations !== 1 ? "s" : ""} configured
        </span>
      </div>

      {/* Completion metrics */}
      <div className="morph-preview__metrics">
        <div className="morph-preview__metric">
          <span className="morph-preview__metric-label">Overall</span>
          <div className="morph-preview__progress-bar">
            <div
              className="morph-preview__progress-fill"
              style={{
                width: `${completionMetrics.overall}%`,
                backgroundColor: this.getProgressColor(
                  completionMetrics.overall
                ),
              }}
            />
          </div>
          <span className="morph-preview__metric-value">
            {completionMetrics.overall}%
          </span>
        </div>

        <div className="morph-preview__metric">
          <span className="morph-preview__metric-label">Characters</span>
          <span className="morph-preview__metric-value">
            {completionMetrics.characters}%
          </span>
        </div>

        <div className="morph-preview__metric">
          <span className="morph-preview__metric-label">Settings</span>
          <span className="morph-preview__metric-value">
            {completionMetrics.settings}%
          </span>
        </div>

        <div className="morph-preview__metric">
          <span className="morph-preview__metric-label">Narrative</span>
          <span className="morph-preview__metric-value">
            {completionMetrics.narrative}%
          </span>
        </div>
      </div>

      {/* Content preview */}
      <div className="morph-preview__content">
        {renderSection("Characters", morphConfig.characters || {})}
        {renderSection("Settings", morphConfig.settings || {})}
        {renderSection("Narrative", morphConfig.narrative || {})}

        {totalTransformations === 0 && (
          <div className="morph-preview__empty">
            <p>No transformations configured yet.</p>
            <p>Add transformation points to see them appear here.</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {completionMetrics.overall < 100 && (
        <div className="morph-preview__recommendations">
          <p className="morph-preview__rec-title">
            💡 Tips for better transformations:
          </p>
          <ul className="morph-preview__rec-list">
            <li>Define character traits and how they adapt to new settings</li>
            <li>Describe location and environmental changes</li>
            <li>Explain narrative adjustments for the new context</li>
          </ul>
        </div>
      )}
    </div>
  );

  function getProgressColor(value: number): string {
    if (value < 33) return "#ef4444";
    if (value < 66) return "#f59e0b";
    return "#10b981";
  }
};

export default MorphPreview;
