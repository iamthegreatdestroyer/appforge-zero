/**
 * Builds Page - Build Queue and History
 * Manage builds, monitor progress, view history
 */

import React, { useState } from 'react';
import { useBuildStore } from '../stores/buildStore';

const BuildsPage: React.FC = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queue = useBuildStore((s) => s.queue);
  const activeBuilds = useBuildStore((s) => s.activeBuilds);
  const history = useBuildStore((s) => s.history);
  const filters = useBuildStore((s) => s.filters);
  const setFilters = useBuildStore((s) => s.setFilters);

  const filteredHistory = history.filter((h) => {
    if (filters.status !== 'all' && h.status !== filters.status) return false;
    return true;
  });

  return (
    <div data-testid="page-builds" className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Builds</h1>
        <button
          data-testid="add-to-queue"
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          + Add to Queue
        </button>
      </div>

      {/* Add to Queue Dialog */}
      {showAddDialog && (
        <div data-testid="add-queue-dialog" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Add to Build Queue</h2>
          <div data-testid="queue-instance-list" className="space-y-2 mb-6 max-h-48 overflow-y-auto">
            {/* Instances would be listed here */}
            <p className="text-gray-500">No instances available</p>
          </div>
          <button
            data-testid="close-dialog"
            onClick={() => setShowAddDialog(false)}
            className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      )}

      {/* Build Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Queued</div>
          <div className="mt-2 text-2xl font-bold">{queue.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Building</div>
          <div className="mt-2 text-2xl font-bold">{activeBuilds.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div className="mt-2 text-2xl font-bold text-green-600">92%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Avg Build Time</div>
          <div className="mt-2 text-2xl font-bold">4m 32s</div>
        </div>
      </div>

      {/* Active Builds */}
      {activeBuilds.length > 0 && (
        <div data-testid="build-progress" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Active Builds</h2>
          <div className="space-y-4">
            {activeBuilds.map((build) => (
              <div key={build.jobId} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{build.jobId}</span>
                  <span data-testid="build-phase" className="text-sm text-gray-600">
                    {build.phase}
                  </span>
                </div>
                <div data-testid="progress-bar" className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${build.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-sm text-gray-600">
                  <span>{build.message}</span>
                  <span>{build.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build Queue */}
      <div data-testid="build-queue" className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Queue</h2>
        {queue.length === 0 ? (
          <div data-testid="empty-queue" className="text-gray-500 py-8 text-center">
            No builds in queue
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((job) => (
              <div
                key={job.id}
                data-testid="queue-item"
                className="flex justify-between items-center py-2 border-b"
              >
                <span>{job.instanceId}</span>
                <span className="text-sm text-gray-600">Position #{queue.indexOf(job) + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Build History */}
      <div data-testid="build-history" className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">History</h2>
          <select
            data-testid="history-status-filter"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as any })}
            className="px-3 py-1 border rounded"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="space-y-2">
          {filteredHistory.slice(0, 10).map((build) => (
            <div
              key={build.id}
              data-testid="history-item"
              className="flex justify-between items-center py-2 border-b cursor-pointer hover:bg-gray-50"
            >
              <div>
                <div className="font-semibold">{build.appId}</div>
                <div className="text-sm text-gray-500">
                  {new Date(build.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  build.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {build.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuildsPage;
