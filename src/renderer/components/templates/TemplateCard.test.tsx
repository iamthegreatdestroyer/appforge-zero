import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TemplateCard from "../TemplateCard";
import { Template } from "../../../types/template";

describe("TemplateCard Component", () => {
  const mockTemplate: Template = {
    id: "test-1",
    title: "Test Template",
    description: "Test description",
    category: "animation",
    createdAt: "2023-01-01T00:00:00Z",
    morphTransformation: {
      characters: {},
      settings: {},
      narrative: {},
    },
  };

  it("renders template card", () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText("Test Template")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("displays category badge", () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText("animation")).toBeInTheDocument();
  });

  it("shows selection indicator when selected", () => {
    render(<TemplateCard template={mockTemplate} isSelected={true} />);
    const card = screen.getByRole("button");
    expect(card).toHaveClass("template-card--selected");
  });

  it("calls onSelect when card is clicked", () => {
    const mockOnSelect = jest.fn();
    render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it("calls onDelete when delete button is clicked", () => {
    const mockOnDelete = jest.fn();
    render(<TemplateCard template={mockTemplate} onDelete={mockOnDelete} />);
    // Hover to show delete button
    fireEvent.mouseEnter(screen.getByRole("button"));
    const deleteBtn = screen.getByText(/delete/i, { selector: "button" });
    fireEvent.click(deleteBtn);
    expect(mockOnDelete).toHaveBeenCalledWith("test-1");
  });

  it("displays usage count", () => {
    const templateWithUsage = {
      ...mockTemplate,
      usageCount: 5,
    };
    render(<TemplateCard template={templateWithUsage} />);
    expect(screen.getByText(/Uses: 5/)).toBeInTheDocument();
  });

  it("displays rating", () => {
    const templateWithRating = {
      ...mockTemplate,
      rating: 4.5,
    };
    render(<TemplateCard template={templateWithRating} />);
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
  });

  it("formats date correctly", () => {
    const fixedDate = "2024-12-23T12:00:00Z";
    const templateWithDate = {
      ...mockTemplate,
      createdAt: fixedDate,
    };
    render(<TemplateCard template={templateWithDate} />);
    // Should format as "Dec 23, 2024"
    expect(screen.getByText(/Dec 23, 2024/)).toBeInTheDocument();
  });
});
