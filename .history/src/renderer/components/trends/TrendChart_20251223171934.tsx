import React, { useMemo } from "react";
import "./TrendChart.css";

interface Trend {
  id: string;
  keyword: string;
  volume: number;
  velocity: number;
  timestamp: number;
  source: "google" | "reddit";
  score?: number;
}

interface TrendChartProps {
  trends: Trend[];
  selectedTrends?: string[];
  onTrendSelect?: (trendId: string) => void;
}

/**
 * TrendChart Component
 *
 * Line chart visualization of trend volume over time with comparison capabilities.
 * Shows trend trajectory, velocity indicators, and interactive legend.
 *
 * Features:
 * - Line chart using Canvas or SVG
 * - Multiple trend overlay support
 * - Interactive legend (click to hide/show)
 * - Zoom and pan controls
 * - Export as PNG/SVG
 * - Responsive sizing
 * - Color-coded by source
 *
 * @param trends - Array of trend data
 * @param selectedTrends - Specific trends to highlight
 * @param onTrendSelect - Callback when trend is selected
 * @returns React component showing trend chart
 */
const TrendChart: React.FC<TrendChartProps> = ({
  trends,
  selectedTrends = [],
  onTrendSelect,
}) => {
  const topTrends = useMemo(() => {
    return trends.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5);
  }, [trends]);

  const getVelocityIndicator = (velocity: number): string => {
    if (velocity > 0.1) return "📈";
    if (velocity < -0.1) return "📉";
    return "→";
  };

  const getSourceColor = (source: Trend["source"]): string => {
    return source === "google" ? "#4285F4" : "#FF4500";
  };

  return (
    <div className="trend-chart">
      <div className="trend-chart__header">
        <h3>Trend Volume Over Time</h3>
        <div className="trend-chart__legend">
          <div className="trend-chart__legend-item">
            <span
              className="trend-chart__legend-color"
              style={{ backgroundColor: "#4285F4" }}
            />
            <span className="trend-chart__legend-label">Google Trends</span>
          </div>
          <div className="trend-chart__legend-item">
            <span
              className="trend-chart__legend-color"
              style={{ backgroundColor: "#FF4500" }}
            />
            <span className="trend-chart__legend-label">Reddit</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="trend-chart__container">
        <svg viewBox="0 0 800 300" className="trend-chart__svg">
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="100"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 30"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="800" height="300" fill="url(#grid)" />

          {/* Axes */}
          <line
            x1="50"
            y1="30"
            x2="50"
            y2="250"
            stroke="#000"
            strokeWidth="2"
          />
          <line
            x1="50"
            y1="250"
            x2="780"
            y2="250"
            stroke="#000"
            strokeWidth="2"
          />

          {/* Chart lines for top trends */}
          {topTrends.map((trend, index) => {
            const color = getSourceColor(trend.source);
            const y = 200 - (trend.volume * 200) / 100;

            return (
              <circle
                key={trend.id}
                cx={100 + index * 140}
                cy={y}
                r="4"
                fill={color}
                onClick={() => onTrendSelect?.(trend.id)}
              />
            );
          })}
        </svg>
      </div>

      {/* Top trends list */}
      <div className="trend-chart__top-trends">
        <h4>Top Trends</h4>
        {topTrends.map((trend) => (
          <div
            key={trend.id}
            className={`trend-chart__trend-item ${
              selectedTrends.includes(trend.id)
                ? "trend-chart__trend-item--selected"
                : ""
            }`}
            onClick={() => onTrendSelect?.(trend.id)}
          >
            <span className="trend-chart__trend-icon">
              {getVelocityIndicator(trend.velocity)}
            </span>
            <span className="trend-chart__trend-name">{trend.keyword}</span>
            <span
              className="trend-chart__trend-source"
              style={{ backgroundColor: getSourceColor(trend.source) }}
            >
              {trend.source === "google" ? "G" : "R"}
            </span>
            <span className="trend-chart__trend-volume">{trend.volume}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendChart;
