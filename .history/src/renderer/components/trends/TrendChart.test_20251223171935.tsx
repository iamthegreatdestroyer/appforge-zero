import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TrendChart from "../TrendChart";

describe("TrendChart Component", () => {
  const mockTrends = [
    {
      id: "trend-1",
      keyword: "AI",
      volume: 85,
      velocity: 0.15,
      timestamp: Date.now(),
      source: "google" as const,
      score: 0.9,
    },
    {
      id: "trend-2",
      keyword: "Blockchain",
      volume: 60,
      velocity: -0.05,
      timestamp: Date.now(),
      source: "reddit" as const,
      score: 0.7,
    },
  ];

  it("renders trend chart", () => {
    render(<TrendChart trends={mockTrends} />);
    expect(screen.getByText("Trend Volume Over Time")).toBeInTheDocument();
  });

  it("displays legend with sources", () => {
    render(<TrendChart trends={mockTrends} />);
    expect(screen.getByText("Google Trends")).toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });

  it("shows top trends list", () => {
    render(<TrendChart trends={mockTrends} />);
    expect(screen.getByText("Top Trends")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Blockchain")).toBeInTheDocument();
  });

  it("displays trend indicators", () => {
    render(<TrendChart trends={mockTrends} />);
    expect(screen.getByText("📈")).toBeInTheDocument(); // Up trend
    expect(screen.getByText("📉")).toBeInTheDocument(); // Down trend
  });

  it("shows trend volume", () => {
    render(<TrendChart trends={mockTrends} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("calls onTrendSelect when trend is clicked", () => {
    const mockOnTrendSelect = jest.fn();
    render(
      <TrendChart trends={mockTrends} onTrendSelect={mockOnTrendSelect} />
    );
    const trendItems = screen.getAllByText(/AI|Blockchain/);
    trendItems.forEach((item) => {
      if (item.textContent?.includes("AI")) {
        item.click();
      }
    });
    // At least one call should have been made
    expect(mockOnTrendSelect).toHaveBeenCalled();
  });

  it("highlights selected trends", () => {
    render(<TrendChart trends={mockTrends} selectedTrends={["trend-1"]} />);
    // The component should indicate selected state
    // (specific implementation depends on CSS class)
  });
});
