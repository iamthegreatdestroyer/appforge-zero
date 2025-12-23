/**
 * AppForge Zero - Main Application Component
 * 
 * Root component that provides the application layout
 * and manages global state initialization.
 * 
 * @module renderer/App
 */

import React, { useEffect, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MainContent from './components/layout/MainContent';
import { useSettingsStore } from './stores/settingsStore';
import { useTemplateStore } from './stores/templateStore';

// Page type definitions
export type PageType = 
  | 'dashboard'
  | 'templates'
  | 'trends'
  | 'builds'
  | 'distribution'
  | 'settings';

/**
 * Main Application Component
 */
const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const { loadSettings } = useSettingsStore();
  const { loadTemplates } = useTemplateStore();

  // Initialize application on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load settings and templates in parallel
        await Promise.all([
          loadSettings(),
          loadTemplates()
        ]);
      } catch (error) {
        console.error('Failed to initialize application:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [loadSettings, loadTemplates]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Initializing AppForge Zero...</h2>
          <p className="text-slate-400 mt-2">Loading templates and settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header currentPage={currentPage} />

        {/* Page Content */}
        <MainContent currentPage={currentPage} />
      </div>
    </div>
  );
};

export default App;
