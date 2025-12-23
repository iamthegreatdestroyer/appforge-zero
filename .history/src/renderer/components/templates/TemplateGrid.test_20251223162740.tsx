import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateGrid from '../TemplateGrid';
import { useTemplateStore } from '../../../store/templateStore';
import { useUIStore } from '../../../store/uiStore';

// Mock the stores
jest.mock('../../../store/templateStore');
jest.mock('../../../store/uiStore');

describe('TemplateGrid Component', () => {
  const mockTemplates = [
    {
      id: '1',
      title: 'Animation Template',
      description: 'A template for creating animations',
      category: 'animation',
      thumbnail: null,
      createdAt: new Date().toISOString(),
      usageCount: 5,
      rating: 4.5,
    },
    {
      id: '2',
      title: 'Game Template',
      description: 'A template for creating games',
      category: 'game',
      thumbnail: 'https://example.com/thumb.png',
      createdAt: new Date().toISOString(),
      usageCount: 10,
      rating: 4.8,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useTemplateStore as jest.Mock).mockImplementation((selector) => {
      const store = {
        templates: mockTemplates,
        selectedTemplate: null,
        setSelectedTemplate: jest.fn(),
        isLoading: false,
      };
      return selector(store);
    });

    (useUIStore as jest.Mock).mockImplementation((selector) => {
      const store = {
        isLoading: false,
      };
      return selector(store);
    });
  });

  it('renders template grid with templates', () => {
    render(<TemplateGrid />);
    expect(screen.getByText('Animation Template')).toBeInTheDocument();
    expect(screen.getByText('Game Template')).toBeInTheDocument();
  });

  it('filters templates by search query', () => {
    render(<TemplateGrid searchQuery="game" />);
    expect(screen.getByText('Game Template')).toBeInTheDocument();
    expect(screen.queryByText('Animation Template')).not.toBeInTheDocument();
  });

  it('filters templates by category', () => {
    render(<TemplateGrid filterCategory="animation" />);
    expect(screen.getByText('Animation Template')).toBeInTheDocument();
    expect(screen.queryByText('Game Template')).not.toBeInTheDocument();
  });

  it('sorts templates by name', () => {
    render(<TemplateGrid sortBy="name" />);
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('Animation Template');
    expect(titles[1]).toHaveTextContent('Game Template');
  });

  it('shows loading state', () => {
    (useUIStore as jest.Mock).mockImplementation((selector) => {
      const store = { isLoading: true };
      return selector(store);
    });

    render(<TemplateGrid />);
    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    (useTemplateStore as jest.Mock).mockImplementation((selector) => {
      const store = {
        templates: [],
        selectedTemplate: null,
        setSelectedTemplate: jest.fn(),
        isLoading: false,
      };
      return selector(store);
    });

    render(<TemplateGrid />);
    expect(
      screen.getByText(/No templates available|No templates match/)
    ).toBeInTheDocument();
  });

  it('calls setSelectedTemplate when card is clicked', () => {
    const mockSetSelectedTemplate = jest.fn();
    (useTemplateStore as jest.Mock).mockImplementation((selector) => {
      const store = {
        templates: mockTemplates,
        selectedTemplate: null,
        setSelectedTemplate: mockSetSelectedTemplate,
        isLoading: false,
      };
      return selector(store);
    });

    render(<TemplateGrid />);
    const firstCard = screen.getByText('Animation Template').closest('[role="button"]');
    fireEvent.click(firstCard!);
    expect(mockSetSelectedTemplate).toHaveBeenCalledWith('1');
  });
});
