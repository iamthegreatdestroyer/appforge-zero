/**
 * AppForge Zero - Renderer Entry Point
 * 
 * Main entry point for the React renderer process.
 * Initializes React 18 with concurrent features.
 * 
 * @module renderer/index
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Get the root container
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found. Make sure index.html has a div#root element.');
}

// Create React 18 root with concurrent features
const root = createRoot(container);

// Render the application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot Module Replacement support for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
