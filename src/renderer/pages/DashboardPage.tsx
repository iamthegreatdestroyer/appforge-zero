/**
 * Dashboard Page - Application Home
 * Shows overview of templates, recent builds, trends, and quick actions
 */

import React, { useEffect, useState } from "react";
import { useTemplateStore } from "../stores/templateStore";
import { useBuildStore } from "../stores/buildStore";
import { useTrendStore } from "../stores/trendStore";

const DashboardPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const templates = useTemplateStore((s) => s.templates);
  const builds = useBuildStore((s) => s.history);
  const trends = useTrendStore((s) => s.trends);
  const loadTemplates = useTemplateStore((s) => s.loadTemplates);
  const loadHistory = useBuildStore((s) => s.loadHistory);
  const loadTrends = useTrendStore((s) => s.loadTrends);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        await Promise.all([loadTemplates(), loadHistory(10), loadTrends()]);
      } finally {
        setIsLoading(false);
      }
    };
    initDashboard();
  }, [loadTemplates, loadHistory, loadTrends]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div data-testid="page-dashboard" className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">
            Total Templates
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {templates.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Builds</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {builds.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active Trends</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {trends.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div className="mt-2 text-3xl font-bold text-green-600">92%</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
            + New App from Template
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded">
            Scan for Trends
          </button>
        </div>
      </div>

      {/* Recent Builds */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Builds</h2>
        <div className="space-y-2">
          {builds.slice(0, 5).map((build) => (
            <div
              key={build.id}
              className="flex items-center justify-between py-2 border-b"
            >
              <span className="text-gray-700">{build.appId}</span>
              <span
                className={`px-2 py-1 rounded text-sm font-medium ${
                  build.status === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {build.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Keywords */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Trending Keywords
        </h2>
        <div className="flex flex-wrap gap-2">
          {trends.slice(0, 10).map((trend) => (
            <span
              key={trend.id}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              {trend.keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
