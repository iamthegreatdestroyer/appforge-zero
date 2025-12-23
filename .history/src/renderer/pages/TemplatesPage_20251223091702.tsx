/**
 * Templates Page - Template Management
 * Browse, select, and configure templates
 */

import React, { useState } from "react";
import { useTemplateStore } from "../stores/templateStore";
import TemplateGrid from "../components/templates/TemplateGrid";
import MorphConfigPanel from "../components/templates/MorphConfigPanel";

const TemplatesPage: React.FC = () => {
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const templates = useTemplateStore((s) => s.templates);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);
  const filters = useTemplateStore((s) => s.filters);
  const setFilters = useTemplateStore((s) => s.setFilters);

  const filteredTemplates = templates.filter((t) => {
    if (
      filters.search &&
      !t.name.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    if (filters.category && t.id !== filters.category) return false;
    return true;
  });

  return (
    <div data-testid="page-templates" className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
        <div className="flex gap-4">
          <input
            data-testid="template-search"
            type="text"
            placeholder="Search templates..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          />
          <select
            data-testid="category-filter"
            value={filters.category || ""}
            onChange={(e) => setFilters({ category: e.target.value || null })}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Categories</option>
            <option value="wallpaper-pack">Wallpaper Pack</option>
            <option value="soundboard">Soundboard</option>
            <option value="widget">Widget</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TemplateGrid
            templates={filteredTemplates}
            onSelectTemplate={(id) => {
              selectTemplate(id);
              setShowConfigPanel(false);
            }}
          />
        </div>

        <div>
          {selectedTemplate && (
            <div
              data-testid="template-details"
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-2xl font-bold mb-4">
                {selectedTemplate.name}
              </h2>
              <p className="text-gray-600 mb-4">
                {selectedTemplate.config.description}
              </p>

              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Category
                  </span>
                  <p className="text-gray-900">
                    {selectedTemplate.config.category}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Version
                  </span>
                  <p className="text-gray-900">
                    {selectedTemplate.config.version}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Author
                  </span>
                  <p className="text-gray-900">
                    {selectedTemplate.config.author}
                  </p>
                </div>
              </div>

              <button
                data-testid="configure-template"
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
              >
                {showConfigPanel ? "Hide Configuration" : "Configure"}
              </button>

              {showConfigPanel && (
                <MorphConfigPanel template={selectedTemplate} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;
