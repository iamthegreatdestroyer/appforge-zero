/**
 * @file Header.tsx
 * @description Page header component with title, actions, and notifications
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBuildStore } from '../../stores/buildStore';
import { useTrendStore } from '../../stores/trendStore';

export type PageType = 'dashboard' | 'templates' | 'trends' | 'builds' | 'distribution' | 'settings';

interface HeaderProps {
  currentPage: PageType;
  onAction?: (action: string) => void;
}

// Page titles and descriptions
const pageInfo: Record<PageType, { title: string; description: string }> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Overview of your templates, builds, and trends'
  },
  templates: {
    title: 'Templates',
    description: 'Manage and morph your app templates'
  },
  trends: {
    title: 'Trend Scanner',
    description: 'Discover trending app ideas and market insights'
  },
  builds: {
    title: 'Build Queue',
    description: 'Monitor and manage your app builds'
  },
  distribution: {
    title: 'Distribution',
    description: 'Publish and distribute your apps'
  },
  settings: {
    title: 'Settings',
    description: 'Configure AppForge Zero preferences'
  }
};

// Icon components
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ currentPage, onAction }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { queue } = useBuildStore();
  const { scanProgress } = useTrendStore();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>>([]);

  const info = pageInfo[currentPage];
  const activeBuilds = queue.filter(b => b.status === 'building').length;
  const isScanning = scanProgress !== null;

  // Add notifications for active processes
  useEffect(() => {
    const newNotifications = [];
    
    if (activeBuilds > 0) {
      newNotifications.push({
        id: 'builds',
        type: 'info' as const,
        message: `${activeBuilds} build${activeBuilds > 1 ? 's' : ''} in progress`,
        timestamp: new Date()
      });
    }
    
    if (isScanning) {
      newNotifications.push({
        id: 'scanning',
        type: 'info' as const,
        message: `Scanning trends: ${scanProgress?.progress || 0}%`,
        timestamp: new Date()
      });
    }
    
    setNotifications(newNotifications);
  }, [activeBuilds, isScanning, scanProgress]);

  const toggleTheme = () => {
    const newTheme = settings.ui.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ ui: { ...settings.ui, theme: newTheme } });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onAction) {
      onAction(`search:${searchQuery}`);
    }
  };

  const handleRefresh = () => {
    if (onAction) {
      onAction('refresh');
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      {/* Left: Page Title */}
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-text-primary">{info.title}</h1>
        <p className="text-sm text-text-secondary">{info.description}</p>
      </div>

      {/* Center: Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates, trends, builds..."
            className="input w-full pl-10 pr-4"
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary 
            hover:bg-surface-hover transition-colors duration-200"
          title="Refresh"
        >
          <RefreshIcon className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary 
            hover:bg-surface-hover transition-colors duration-200"
          title={`Switch to ${settings.ui.theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {settings.ui.theme === 'dark' ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary 
              hover:bg-surface-hover transition-colors duration-200 relative"
            title="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-border">
                <h3 className="font-medium text-text-primary">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-text-secondary">
                    No notifications
                  </div>
                ) : (
                  <ul>
                    {notifications.map((notification) => (
                      <li 
                        key={notification.id}
                        className="p-3 border-b border-border last:border-0 hover:bg-surface-hover"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`
                            w-2 h-2 mt-2 rounded-full
                            ${notification.type === 'info' ? 'bg-primary' : ''}
                            ${notification.type === 'success' ? 'bg-success' : ''}
                            ${notification.type === 'warning' ? 'bg-warning' : ''}
                            ${notification.type === 'error' ? 'bg-error' : ''}
                          `} />
                          <div className="flex-1">
                            <p className="text-sm text-text-primary">{notification.message}</p>
                            <p className="text-xs text-text-muted mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          {activeBuilds > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary">{activeBuilds} building</span>
            </div>
          )}
          {isScanning && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-xs font-medium text-accent">Scanning</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
