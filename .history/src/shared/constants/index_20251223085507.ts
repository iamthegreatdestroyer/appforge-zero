/**
 * Application Constants
 * Global configuration values used throughout the app
 */

// Application Metadata
export const APP_NAME = 'AppForge Zero';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-Driven Template Morphing Engine';

// Build Configuration
export const MIN_SDK = 24;
export const TARGET_SDK = 34;
export const COMPILE_SDK = 34;

export const BUILD_TYPES = {
  DEBUG: 'debug',
  RELEASE: 'release',
} as const;

export const BUILD_PHASES = [
  'queued',
  'preparing',
  'morphing',
  'compiling',
  'signing',
  'complete',
  'failed',
] as const;

// Template Categories
export const TEMPLATE_CATEGORIES = [
  'wallpaper-pack',
  'quote-cards',
  'sound-boards',
  'ringtone-pack',
  'icon-pack',
  'widget-pack',
  'utility',
  'entertainment',
] as const;

// Trend Sources
export const TREND_SOURCES = ['google', 'reddit', 'twitter'] as const;

// API Timeouts
export const API_TIMEOUT = 30000; // 30 seconds
export const BUILD_TIMEOUT = 600000; // 10 minutes
export const SCAN_TIMEOUT = 120000; // 2 minutes

// UI Defaults
export const ITEMS_PER_PAGE = 20;
export const CHART_HEIGHT = 300;
export const REFRESH_INTERVAL = 5000; // 5 seconds

// Distribution Channels
export const DISTRIBUTION_CHANNELS = [
  { id: 'gumroad', name: 'Gumroad', icon: '🔗' },
  { id: 'kofi', name: 'Ko-fi', icon: '☕' },
  { id: 'itchio', name: 'Itch.io', icon: '🎮' },
] as const;

// Default Prices
export const DEFAULT_PRICE = 1.99;
export const MIN_PRICE = 0.99;
export const MAX_PRICE = 99.99;

// File Size Limits
export const MAX_APK_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_ASSET_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// Image Dimensions
export const APP_ICON_SIZE = 512;
export const SCREENSHOT_WIDTH = 540;
export const SCREENSHOT_HEIGHT = 720;
export const WALLPAPER_MIN_WIDTH = 1080;
export const WALLPAPER_MIN_HEIGHT = 1920;

// Storage Keys
export const STORAGE_KEYS = {
  LAST_BUILD_PATH: 'lastBuildPath',
  ANDROID_SDK_PATH: 'androidSdkPath',
  LAST_SCAN_TIME: 'lastScanTime',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;
