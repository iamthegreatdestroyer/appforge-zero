/**
 * @file MainContent.tsx
 * @description Main content area with page routing and lazy loading
 */

import React, { Suspense, lazy } from 'react';

export type PageType = 'dashboard' | 'templates' | 'trends' | 'builds' | 'distribution' | 'settings';

interface MainContentProps {
  currentPage: PageType;
}

// Lazy load page components for better performance
const DashboardPage = lazy(() => import('../../pages/DashboardPage'));
const TemplatesPage = lazy(() => import('../../pages/TemplatesPage'));
const TrendsPage = lazy(() => import('../../pages/TrendsPage'));
const BuildsPage = lazy(() => import('../../pages/BuildsPage'));
const DistributionPage = lazy(() => import('../../pages/DistributionPage'));
const SettingsPage = lazy(() => import('../../pages/SettingsPage'));

// Loading spinner component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-text-secondary">Loading...</p>
    </div>
  </div>
);

// Error boundary fallback
const PageError: React.FC<{ error?: Error; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-4 text-center max-w-md">
      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text-primary">Something went wrong</h2>
      <p className="text-text-secondary">
        {error?.message || 'An error occurred while loading this page.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Try Again
        </button>
      )}
    </div>
  </div>
);

// Page component mapping
const pageComponents: Record<PageType, React.LazyExoticComponent<React.FC>> = {
  dashboard: DashboardPage,
  templates: TemplatesPage,
  trends: TrendsPage,
  builds: BuildsPage,
  distribution: DistributionPage,
  settings: SettingsPage,
};

export const MainContent: React.FC<MainContentProps> = ({ currentPage }) => {
  const PageComponent = pageComponents[currentPage];

  if (!PageComponent) {
    return (
      <PageError 
        error={new Error(`Unknown page: ${currentPage}`)} 
      />
    );
  }

  return (
    <main className="flex-1 overflow-hidden bg-background">
      <div className="h-full overflow-y-auto p-6">
        <Suspense fallback={<PageLoader />}>
          <PageComponent />
        </Suspense>
      </div>
    </main>
  );
};

export default MainContent;
