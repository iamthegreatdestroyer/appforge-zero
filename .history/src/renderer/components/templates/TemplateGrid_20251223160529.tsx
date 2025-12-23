import React, { useMemo } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { useUIStore } from '../../store/uiStore';
import TemplateCard from './TemplateCard';
import './TemplateGrid.css';

interface TemplateGridProps {
  searchQuery?: string;
  sortBy?: 'name' | 'dateAdded' | 'popularity';
  filterCategory?: string;
}

/**
 * TemplateGrid Component
 *
 * Renders a responsive grid of template cards with optional filtering and sorting.
 * Displays 2-4 columns based on viewport width with lazy loading of template cards.
 *
 * Features:
 * - Responsive grid layout (CSS Grid)
 * - Search filtering by title and description
 * - Sort by name, date added, or popularity
 * - Category filtering
 * - Selection state management
 * - Drag-and-drop support (via parent)
 * - Hover effects and smooth transitions
 *
 * @param searchQuery - Optional search string to filter templates
 * @param sortBy - Sort order: 'name' | 'dateAdded' | 'popularity'
 * @param filterCategory - Optional category filter
 * @returns React component displaying filtered and sorted template grid
 */
const TemplateGrid: React.FC<TemplateGridProps> = ({
  searchQuery = '',
  sortBy = 'dateAdded',
  filterCategory = undefined,
}) => {
  const templates = useTemplateStore((state) => state.templates);
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useTemplateStore((state) => state.setSelectedTemplate);
  const isLoading = useUIStore((state) => state.isLoading);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          template.title.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filterCategory && template.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [templates, searchQuery, filterCategory]);

  // Sort templates
  const sortedTemplates = useMemo(() => {
    const sorted = [...filteredTemplates];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'dateAdded':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'popularity':
        sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      default:
        break;
    }

    return sorted;
  }, [filteredTemplates, sortBy]);

  const handleTemplateSelect = (templateId: string): void => {
    setSelectedTemplate(templateId);
  };

  const handleTemplateDeselect = (): void => {
    setSelectedTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="template-grid template-grid--loading">
        <div className="loading-spinner">Loading templates...</div>
      </div>
    );
  }

  if (sortedTemplates.length === 0) {
    return (
      <div className="template-grid template-grid--empty">
        <div className="empty-state">
          <p className="empty-state__message">
            {templates.length === 0
              ? 'No templates available. Create your first template to get started.'
              : 'No templates match your search criteria.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-grid">
      {sortedTemplates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplate === template.id}
          onSelect={() => handleTemplateSelect(template.id)}
          onDeselect={handleTemplateDeselect}
        />
      ))}
    </div>
  );
};

export default TemplateGrid;
