import React, { useMemo } from 'react';
import { useTrendStore } from '../../store/trendStore';
import './TrendList.css';

interface Trend {
  id: string;
  keyword: string;
  volume: number;
  velocity: number;
  timestamp: number;
  source: 'google' | 'reddit';
  score?: number;
  isFavorited?: boolean;
  isArchived?: boolean;
}

interface TrendListProps {
  trends: Trend[];
  sortBy?: 'volume' | 'velocity' | 'timestamp';
  filterSource?: 'all' | 'google' | 'reddit';
}

/**
 * TrendList Component
 *
 * Filterable list of trends with sorting, favoriting, and archiving.
 * Displays trend indicators (up/down/stable), source badges, and scores.
 *
 * Features:
 * - Sort by volume, velocity, or timestamp
 * - Filter by source (Google, Reddit, All)
 * - Favorite/Unfavorite trends
 * - Archive trends
 * - View details button
 * - Color-coded indicators
 * - Responsive design
 *
 * @param trends - Array of trend data
 * @param sortBy - Sort order
 * @param filterSource - Source filter
 * @returns React component showing filtered trend list
 */
const TrendList: React.FC<TrendListProps> = ({
  trends,
  sortBy = 'volume',
  filterSource = 'all',
}) => {
  const selectedTrend = useTrendStore((state) => state.selectedTrend);
  const setSelectedTrend = useTrendStore((state) => state.setSelectedTrend);
  const favoriteTrend = useTrendStore((state) => state.favoriteTrend);
  const archiveTrend = useTrendStore((state) => state.archiveTrend);

  const filteredAndSorted = useMemo(() => {
    let filtered = trends.filter((t) => !t.isArchived);

    if (filterSource !== 'all') {
      filtered = filtered.filter((t) => t.source === filterSource);
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return (b.volume || 0) - (a.volume || 0);
        case 'velocity':
          return (b.velocity || 0) - (a.velocity || 0);
        case 'timestamp':
          return (b.timestamp || 0) - (a.timestamp || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [trends, sortBy, filterSource]);

  const getVelocityIndicator = (velocity: number): JSX.Element => {
    if (velocity > 0.1) {
      return <span className="trend-list__indicator trend-list__indicator--up">📈</span>;
    }
    if (velocity < -0.1) {
      return <span className="trend-list__indicator trend-list__indicator--down">📉</span>;
    }
    return <span className="trend-list__indicator trend-list__indicator--stable">→</span>;
  };

  const getScoreBadge = (score?: number): string => {
    if (!score) return '◯';
    if (score < 0.33) return '🔴';
    if (score < 0.66) return '🟡';
    return '🟢';
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return '< 1h ago';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="trend-list">
      {filteredAndSorted.map((trend) => (
        <div
          key={trend.id}
          className={`trend-list__item ${
            selectedTrend === trend.id ? 'trend-list__item--selected' : ''
          }`}
          onClick={() => setSelectedTrend(trend.id)}
        >
          {/* Velocity indicator */}
          <div className="trend-list__indicator-col">
            {getVelocityIndicator(trend.velocity)}
          </div>

          {/* Trend info */}
          <div className="trend-list__info">
            <h4 className="trend-list__keyword">{trend.keyword}</h4>
            <div className="trend-list__metadata">
              <span className="trend-list__source">
                {trend.source === 'google' ? '📊 Google' : '🔗 Reddit'}
              </span>
              <span className="trend-list__date">{formatDate(trend.timestamp)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="trend-list__stats">
            <div className="trend-list__stat">
              <span className="trend-list__stat-label">Volume</span>
              <span className="trend-list__stat-value">{trend.volume}%</span>
            </div>
            <div className="trend-list__stat">
              <span className="trend-list__stat-label">Score</span>
              <span className="trend-list__stat-value">
                {getScoreBadge(trend.score)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="trend-list__actions">
            <button
              className={`trend-list__action-btn trend-list__action-btn--favorite ${
                trend.isFavorited ? 'trend-list__action-btn--favorited' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                favoriteTrend(trend.id);
              }}
              title={trend.isFavorited ? 'Remove favorite' : 'Add favorite'}
            >
              {trend.isFavorited ? '❤️' : '🤍'}
            </button>
            <button
              className="trend-list__action-btn trend-list__action-btn--archive"
              onClick={(e) => {
                e.stopPropagation();
                archiveTrend(trend.id);
              }}
              title="Archive trend"
            >
              📦
            </button>
          </div>
        </div>
      ))}

      {filteredAndSorted.length === 0 && (
        <div className="trend-list__empty">
          <p>No trends found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default TrendList;
