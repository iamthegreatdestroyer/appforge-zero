import React, { useState } from 'react';
import { Template } from '../../types/template';
import './TemplateCard.css';

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

/**
 * TemplateCard Component
 *
 * Displays a single template as a card with thumbnail, title, description,
 * metadata, and action buttons. Supports selection, deletion, and editing.
 *
 * Features:
 * - Display template info: title, description, category, date
 * - Thumbnail image or default icon
 * - Usage count and ratings (if available)
 * - Selection state with visual feedback
 * - Hover actions: Edit, Delete, Select
 * - Accessible keyboard navigation
 * - Responsive sizing
 *
 * @param template - Template data object
 * @param isSelected - Whether card is currently selected
 * @param onSelect - Callback when card is selected
 * @param onDeselect - Callback when card is deselected
 * @param onDelete - Callback when delete button is clicked
 * @param onEdit - Callback when edit button is clicked
 * @returns React component displaying a single template card
 */
const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected = false,
  onSelect,
  onDeselect,
  onDelete,
  onEdit,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = (): void => {
    if (isSelected) {
      onDeselect?.();
    } else {
      onSelect?.();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`template-card ${isSelected ? 'template-card--selected' : ''} ${
        isHovered ? 'template-card--hovered' : ''
      }`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${template.title} template`}
      aria-selected={isSelected}
    >
      {/* Thumbnail */}
      <div className="template-card__thumbnail">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.title}
            className="template-card__image"
            loading="lazy"
          />
        ) : (
          <div className="template-card__placeholder">
            <span className="template-card__icon">🎬</span>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div className="template-card__selection-indicator">
            <span className="template-card__checkmark">✓</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="template-card__content">
        <div className="template-card__header">
          <h3 className="template-card__title">{template.title}</h3>
          <span className="template-card__category">{template.category}</span>
        </div>

        {template.description && (
          <p className="template-card__description">{template.description}</p>
        )}

        {/* Metadata */}
        <div className="template-card__metadata">
          <span className="template-card__date">{formatDate(template.createdAt)}</span>
          {template.usageCount !== undefined && (
            <span className="template-card__usage">
              Uses: {template.usageCount}
            </span>
          )}
          {template.rating !== undefined && (
            <span className="template-card__rating">
              ⭐ {template.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      {isHovered && (
        <div className="template-card__actions">
          {onEdit && (
            <button
              className="template-card__action-btn template-card__action-btn--edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template.id);
              }}
              aria-label={`Edit ${template.title}`}
            >
              ✏️ Edit
            </button>
          )}
          {onDelete && (
            <button
              className="template-card__action-btn template-card__action-btn--delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
              aria-label={`Delete ${template.title}`}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateCard;
