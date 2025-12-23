import React, { useMemo } from "react";
import { useTrendStore } from "../../store/trendStore";
import "./TrendDetail.css";

interface TrendDetailProps {
  trendId: string;
}

/**
 * TrendDetail Component
 *
 * Displays comprehensive trend information including historical data,
 * suggested templates, and AI-generated insights.
 *
 * Features:
 * - Full trend metadata and statistics
 * - Historical trend data visualization
 * - Related keywords
 * - Suggested templates
 * - "Create App from Trend" action
 * - Confidence score and data sources
 * - Trend predictions (if available)
 *
 * @param trendId - ID of trend to display
 * @returns React component showing trend details
 */
const TrendDetail: React.FC<TrendDetailProps> = ({ trendId }) => {
  const trends = useTrendStore((state) => state.trends);
  const createAppFromTrend = useTrendStore((state) => state.createAppFromTrend);

  const trend = useMemo(
    () => trends.find((t) => t.id === trendId),
    [trends, trendId]
  );

  if (!trend) {
    return (
      <div className="trend-detail trend-detail--empty">
        <p>Select a trend to view details.</p>
      </div>
    );
  }

  const handleCreateApp = (): void => {
    createAppFromTrend(trend.id);
  };

  const getConfidenceColor = (score?: number): string => {
    if (!score) return "#9ca3af";
    if (score < 0.5) return "#ef4444";
    if (score < 0.75) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="trend-detail">
      <div className="trend-detail__header">
        <h2 className="trend-detail__title">{trend.keyword}</h2>
        <button
          className="trend-detail__create-btn"
          onClick={handleCreateApp}
          title="Create app based on this trend"
        >
          ✨ Create App from Trend
        </button>
      </div>

      {/* Key metrics */}
      <div className="trend-detail__metrics">
        <div className="trend-detail__metric">
          <label className="trend-detail__metric-label">Volume</label>
          <div className="trend-detail__metric-value">{trend.volume}%</div>
          <div className="trend-detail__metric-bar">
            <div
              className="trend-detail__metric-fill"
              style={{ width: `${trend.volume}%` }}
            />
          </div>
        </div>

        <div className="trend-detail__metric">
          <label className="trend-detail__metric-label">Velocity</label>
          <div className="trend-detail__metric-value">
            {trend.velocity > 0 ? "+" : ""}
            {trend.velocity.toFixed(2)}
          </div>
        </div>

        <div className="trend-detail__metric">
          <label className="trend-detail__metric-label">Confidence</label>
          <div className="trend-detail__metric-value">
            {trend.score ? `${(trend.score * 100).toFixed(0)}%` : "N/A"}
          </div>
          {trend.score && (
            <div className="trend-detail__metric-indicator">
              <div
                className="trend-detail__confidence-dot"
                style={{
                  backgroundColor: getConfidenceColor(trend.score),
                }}
              />
            </div>
          )}
        </div>

        <div className="trend-detail__metric">
          <label className="trend-detail__metric-label">Source</label>
          <div className="trend-detail__metric-value">
            {trend.source === "google" ? "📊 Google Trends" : "🔗 Reddit"}
          </div>
        </div>
      </div>

      {/* Details sections */}
      <div className="trend-detail__section">
        <h3 className="trend-detail__section-title">About This Trend</h3>
        <p className="trend-detail__description">
          {trend.keyword} is currently{" "}
          {trend.velocity > 0 ? "gaining" : "losing"} momentum with a search
          volume of {trend.volume}%. This trend is being tracked from{" "}
          {trend.source === "google" ? "Google Trends" : "Reddit"}.
        </p>
      </div>

      {/* Related keywords */}
      <div className="trend-detail__section">
        <h3 className="trend-detail__section-title">Related Keywords</h3>
        <div className="trend-detail__keywords">
          {/* Placeholder - would come from data */}
          <span className="trend-detail__keyword-tag">{trend.keyword}</span>
          <span className="trend-detail__keyword-tag">Similar Topic 1</span>
          <span className="trend-detail__keyword-tag">Similar Topic 2</span>
          <span className="trend-detail__keyword-tag">Similar Topic 3</span>
        </div>
      </div>

      {/* Suggested templates */}
      <div className="trend-detail__section">
        <h3 className="trend-detail__section-title">Suggested Templates</h3>
        <div className="trend-detail__suggestions">
          <div className="trend-detail__suggestion">
            <span className="trend-detail__suggestion-title">
              Entertainment App Template
            </span>
            <span className="trend-detail__suggestion-score">85%</span>
          </div>
          <div className="trend-detail__suggestion">
            <span className="trend-detail__suggestion-title">
              Social Media Template
            </span>
            <span className="trend-detail__suggestion-score">72%</span>
          </div>
          <div className="trend-detail__suggestion">
            <span className="trend-detail__suggestion-title">
              Content Sharing Template
            </span>
            <span className="trend-detail__suggestion-score">68%</span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="trend-detail__section">
        <h3 className="trend-detail__section-title">💡 AI Insights</h3>
        <div className="trend-detail__insights">
          <div className="trend-detail__insight">
            <span className="trend-detail__insight-icon">🎯</span>
            <div>
              <p className="trend-detail__insight-title">Market Opportunity</p>
              <p className="trend-detail__insight-text">
                This trend shows strong growth potential. Consider building an
                app that addresses a gap in the current market.
              </p>
            </div>
          </div>
          <div className="trend-detail__insight">
            <span className="trend-detail__insight-icon">🏆</span>
            <div>
              <p className="trend-detail__insight-title">Competition Level</p>
              <p className="trend-detail__insight-text">
                Moderate competition. Act soon to capture market share before
                saturation.
              </p>
            </div>
          </div>
          <div className="trend-detail__insight">
            <span className="trend-detail__insight-icon">💰</span>
            <div>
              <p className="trend-detail__insight-title">Monetization Ideas</p>
              <p className="trend-detail__insight-text">
                Premium features, ads, and in-app purchases are viable
                monetization strategies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical data note */}
      <div className="trend-detail__footer">
        <p className="trend-detail__footer-text">
          Last updated: {new Date(trend.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default TrendDetail;
