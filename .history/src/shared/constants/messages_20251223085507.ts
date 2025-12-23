/**
 * Error Messages
 * Standardized error messages for consistent user feedback
 */

export const ERROR_MESSAGES = {
  // Build Errors
  BUILD_FAILED: 'Build failed. Please check the build logs for details.',
  BUILD_TIMEOUT: 'Build timed out. The build took too long to complete.',
  BUILD_CANCELLED: 'Build was cancelled.',
  APK_NOT_FOUND: 'APK file was not found after build.',

  // Template Errors
  TEMPLATE_NOT_FOUND: 'Template not found.',
  TEMPLATE_INVALID: 'Template is invalid or corrupted.',
  MORPH_FAILED: 'Failed to apply morph configuration.',
  INVALID_MORPH_CONFIG: 'Morph configuration is invalid.',

  // Trend Errors
  SCAN_FAILED: 'Trend scan failed.',
  SCAN_TIMEOUT: 'Trend scan timed out.',
  INVALID_TREND_DATA: 'Invalid trend data received.',

  // Distribution Errors
  PUBLISH_FAILED: 'Failed to publish app.',
  CHANNEL_NOT_CONFIGURED: 'Distribution channel is not configured.',
  INVALID_CHANNEL_CONFIG: 'Invalid channel configuration.',

  // Database Errors
  DB_ERROR: 'Database error occurred.',
  DB_INIT_FAILED: 'Failed to initialize database.',

  // Network Errors
  NETWORK_ERROR: 'Network error occurred.',
  API_TIMEOUT: 'API request timed out.',
  INVALID_API_KEY: 'Invalid API key provided.',

  // File Errors
  FILE_NOT_FOUND: 'File not found.',
  INVALID_FILE: 'Invalid file format.',
  FILE_TOO_LARGE: 'File is too large.',

  // General Errors
  UNKNOWN_ERROR: 'An unknown error occurred.',
  OPERATION_CANCELLED: 'Operation was cancelled.',
  INVALID_INPUT: 'Invalid input provided.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  BUILD_COMPLETE: 'Build completed successfully.',
  TEMPLATE_CREATED: 'Template created successfully.',
  MORPH_APPLIED: 'Morph configuration applied successfully.',
  SCAN_COMPLETE: 'Trend scan completed successfully.',
  APP_PUBLISHED: 'App published successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
} as const;
