/**
 * Templates Page — Template library, morph configuration, and export.
 */

import React, { useState } from 'react';
import { useTemplateStore } from '../stores/templateStore';
import TemplateGrid from '../components/templates/TemplateGrid';
import MorphConfigPanel from '../components/templates/MorphConfigPanel';

const TemplatesPage: React.FC = () => {
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const templates = useTemplateStore((s) => s.templates);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);
  const filters = useTemplateStore((s) => s.filters);
  const setFilters = useTemplateStore((s) => s.setFilters);

  const filteredTemplates = templates.filter((t) => {
    if (filters.search && !t.config.name.toLowerCase().includes(filters.search.toLowerCase()))
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
            aria-label="Filter by category"
            value={filters.category || ''}
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
        <div data-testid="template-grid" className="lg:col-span-2">
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
            <div data-testid="template-details" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">{selectedTemplate.config.name}</h2>
              <p className="text-gray-600 mb-4">{selectedTemplate.config.description}</p>

              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Category</span>
                  <p className="text-gray-900">{selectedTemplate.config.category}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Version</span>
                  <p className="text-gray-900">{selectedTemplate.config.version}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Author</span>
                  <p className="text-gray-900">{selectedTemplate.config.author}</p>
                </div>
              </div>

              <button
                data-testid="configure-template"
                type="button"
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mb-2"
              >
                {showConfigPanel ? 'Hide Configuration' : 'Configure'}
              </button>

              {showConfigPanel && <MorphConfigPanel />}

              <MorphExportPanel templateId={selectedTemplate.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Morph Export Panel ────────────────────────────────────────────────────────

interface MorphFormValues {
  niche: string;
  audience: string;
  monetization: 'subscription' | 'one-time' | 'freemium' | 'ads';
  keepFeatures: string;
}

const MorphExportPanel: React.FC<{ templateId: string }> = ({ templateId }) => {
  const [form, setForm] = useState<MorphFormValues>({
    niche: '',
    audience: 'B2C',
    monetization: 'subscription',
    keepFeatures: '',
  });
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    if (!form.niche.trim()) {
      setStatus('Please enter a niche.');
      return;
    }
    setStatus('Morphing...');
    try {
      const keepFeatures = form.keepFeatures
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await window.api.templates.morph(templateId, {
        niche: form.niche,
        audience: form.audience,
        monetization: form.monetization,
        keepFeatures,
      });

      setStatus(`Exported to ./output/${form.niche}-app/`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div data-testid="morph-export-panel" className="mt-4 border-t pt-4">
      <h3 className="font-semibold text-gray-800 mb-3">Morph & Export</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Niche</label>
          <input
            data-testid="morph-niche"
            type="text"
            placeholder="e.g. fitness, finance, education"
            value={form.niche}
            onChange={(e) => setForm({ ...form, niche: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Audience</label>
          <select
            data-testid="morph-audience"
            aria-label="Target audience"
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
          >
            <option value="B2C">B2C</option>
            <option value="enterprise">Enterprise</option>
            <option value="SMB">SMB</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Monetization</label>
          <div className="flex flex-wrap gap-2">
            {(['subscription', 'one-time', 'freemium', 'ads'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="monetization"
                  value={m}
                  checked={form.monetization === m}
                  onChange={() => setForm({ ...form, monetization: m })}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Keep Features (comma-separated)
          </label>
          <input
            data-testid="morph-keep-features"
            type="text"
            placeholder="e.g. Header, Footer, Auth"
            value={form.keepFeatures}
            onChange={(e) => setForm({ ...form, keepFeatures: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        <button
          data-testid="morph-export-btn"
          onClick={handleExport}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded text-sm"
        >
          Morph & Export App
        </button>

        {status && (
          <p data-testid="morph-status" className="text-sm text-gray-600 mt-2">
            {status}
          </p>
        )}
      </div>
    </div>
  );
};

export default TemplatesPage;
