import React, { useMemo, useState } from 'react';
import { useTrendStore } from '../../store/trendStore';
import TrendChart from './TrendChart';
import TrendList from './TrendList';
import TrendDetail from './TrendDetail';
import './TrendPage.css';

interface TrendPageProps {
  showChart?: boolean;
  showDetails?: boolean;
}

/**
 * Trend Analysis Page
 *
 * Main interface for trend discovery and analysis combining chart view,
 * trend listing, and detailed information.
 *
 * Features:
 * - Real-time trend visualization
 * - Filterable trend list
 * - Trend comparison
 * - Detailed insights
 * - Create app from trend
 * - Archive/Delete trends
 *
 * @param showChart - Display trend chart
 * @param showDetails - Display trend details panel
 * @returns React component for trend analysis
 */
const TrendPage: React.FC<TrendPageProps> = ({
  showChart = true,
  showDetails = true,
}) => {
  const trends = useTrendStore((state) => state.trends);
  const selectedTrend = useTrendStore((state) => state.selectedTrend);
  const [sortBy, setSortBy] = useState<'volume' | 'velocity' | 'timestamp'>(
    'volume'
  );
  const [filterSource, setFilterSource] = useState<'all' | 'google' | 'reddit'>(
    'all'
  );

  const stats = useMemo(() => {
    return {
      total: trends.length,
      trending: trends.filter((t) => t.velocity > 0.1).length,
      declining: trends.filter((t) => t.velocity < -0.1).length,
      stable: trends.filter((t) => Math.abs(t.velocity) <= 0.1).length,
    };
  }, [trends]);

  return (
    <div className="trend-page">
      <div className="trend-page__header">
        <h1>Trend Analysis</h1>
        <div className="trend-page__stats">
          <div className="trend-page__stat">
            <span className="trend-page__stat-label">Total</span>
            <span className="trend-page__stat-value">{stats.total}</span>
          </div>
          <div className="trend-page__stat">
            <span className="trend-page__stat-label">Trending ↑</span>
            <span className="trend-page__stat-value">{stats.trending}</span>
          </div>
          <div className="trend-page__stat">
            <span className="trend-page__stat-label">Declining ↓</span>
            <span className="trend-page__stat-value">{stats.declining}</span>
          </div>
          <div className="trend-page__stat">
            <span className="trend-page__stat-label">Stable →</span>
            <span className="trend-page__stat-value">{stats.stable}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {showChart && trends.length > 0 && <TrendChart trends={trends} />}

      {/* Main content */}
      <div className="trend-page__content">
        {/* Trend list */}
        <div className="trend-page__section trend-page__section--list">
          <div className="trend-page__list-controls">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as typeof sortBy)
              }
              className="trend-page__sort-select"
            >
              <option value="volume">Sort by Volume</option>
              <option value="velocity">Sort by Velocity</option>
              <option value="timestamp">Sort by Date</option>
            </select>

            <select
              value={filterSource}
              onChange={(e) =>
                setFilterSource(e.target.value as typeof filterSource)
              }
              className="trend-page__filter-select"
            >
              <option value="all">All Sources</option>
              <option value="google">Google Trends</option>
              <option value="reddit">Reddit</option>
            </select>
          </div>

          {trends.length > 0 ? (
            <TrendList
              trends={trends}
              sortBy={sortBy}
              filterSource={filterSource}
            />
          ) : (
            <div className="trend-page__empty">
              <p>No trends discovered yet. Run a scan to get started.</p>
            </div>
          )}
        </div>

        {/* Trend details */}
        {showDetails && selectedTrend && (
          <div className="trend-page__section trend-page__section--details">
            <TrendDetail trendId={selectedTrend} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendPage;
