/**
 * Trends Page - Trend Analysis and Discovery
 * Scan for trends, analyze market opportunities
 */

import React, { useState } from 'react';
import { useTrendStore } from '../stores/trendStore';

const TrendsPage: React.FC = () => {
  const [showScanDialog, setShowScanDialog] = useState(false);
  const trends = useTrendStore((s) => s.trends);
  const scanProgress = useTrendStore((s) => s.scanProgress);
  const lastScanAt = useTrendStore((s) => s.lastScanAt);
  const startScan = useTrendStore((s) => s.startScan);
  const filters = useTrendStore((s) => s.filters);
  const setFilters = useTrendStore((s) => s.setFilters);

  const filteredTrends = trends.filter((t) => {
    if (filters.search && !t.keyword.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.sources.length > 0 && !filters.sources.includes(t.source)) return false;
    return true;
  });

  const handleStartScan = async () => {
    await startScan();
    setShowScanDialog(false);
  };

  return (
    <div data-testid="page-trends" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trends</h1>
          {lastScanAt && (
            <p data-testid="last-scan-time" className="text-sm text-gray-500 mt-1">
              Last scanned: {new Date(lastScanAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          data-testid="scan-trends"
          onClick={() => setShowScanDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          Scan Trends
        </button>
      </div>

      {/* Scan Dialog */}
      {showScanDialog && (
        <div data-testid="scan-options-dialog" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Scan Options</h2>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                data-testid="source-google"
                type="checkbox"
                defaultChecked
                className="mr-3"
              />
              <span>Google Trends</span>
            </label>
            <label className="flex items-center">
              <input
                data-testid="source-reddit"
                type="checkbox"
                defaultChecked
                className="mr-3"
              />
              <span>Reddit</span>
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              data-testid="start-scan"
              onClick={handleStartScan}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
            >
              Start Scan
            </button>
            <button
              data-testid="cancel-scan"
              onClick={() => setShowScanDialog(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scan Progress */}
      {scanProgress.isScanning && (
        <div data-testid="scan-progress" className="bg-blue-50 rounded-lg p-4">
          <div data-testid="scan-status" className="text-sm font-medium text-blue-900 mb-2">
            Scanning: {scanProgress.source}
          </div>
          <div data-testid="scan-progress-bar" className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div data-testid="trend-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Trends</div>
          <div className="mt-2 text-2xl font-bold">{filteredTrends.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Trending Up</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {filteredTrends.filter((t) => t.velocity > 0).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Trending Down</div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {filteredTrends.filter((t) => t.velocity < 0).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          data-testid="trend-search"
          type="text"
          placeholder="Search trends..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select
          data-testid="source-filter"
          value={filters.sources[0] || ''}
          onChange={(e) => setFilters({ sources: e.target.value ? [e.target.value as any] : [] })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Sources</option>
          <option value="google">Google</option>
          <option value="reddit">Reddit</option>
        </select>
      </div>

      {/* Trends List */}
      <div data-testid="trend-list" className="space-y-3">
        {filteredTrends.map((trend) => (
          <div
            key={trend.id}
            data-testid="trend-card"
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{trend.keyword}</h3>
                <p className="text-sm text-gray-500">{trend.source} • {trend.category}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{trend.volume}</div>
                <div className={`text-sm ${trend.velocity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.velocity > 0 ? '↑' : '↓'} {Math.abs(trend.velocity).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendsPage;
